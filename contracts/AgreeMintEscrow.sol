// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * AgreeMint Escrow Contract
 *
 * Institutional-grade escrow for agreements, bets, and sales.
 * Supports ETH and ERC-20 tokens. Each escrow is linked to an
 * agreement hash for on-chain verification.
 *
 * Flow:
 *   1. Creator deploys escrow with agreement hash, parties, arbiter
 *   2. Parties deposit funds
 *   3. Both parties approve release  OR  arbiter resolves dispute
 *   4. Funds released to winner/seller or refunded
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgreeMintEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Types ───────────────────────────────────────────
    enum EscrowState { Created, Funded, Disputed, Resolved, Released, Refunded, Cancelled }
    enum EscrowType  { Sale, Bet, Service, Custom }

    struct Escrow {
        uint256 id;
        EscrowType escrowType;
        EscrowState state;

        address partyA;           // creator / buyer
        address partyB;           // counterparty / seller
        address arbiter;          // dispute resolver (can be platform)

        address token;            // address(0) = native ETH
        uint256 amount;           // total escrow amount
        uint256 partyADeposit;    // how much A deposited
        uint256 partyBDeposit;    // how much B deposited

        bytes32 agreementHash;    // SHA-256 hash of the agreement document
        string  agreementId;      // off-chain agreement ID (AgreeMint UUID)

        bool partyAApproved;      // A approved release to B
        bool partyBApproved;      // B approved release to A

        address releaseTo;        // who gets the funds on release
        uint256 createdAt;
        uint256 resolvedAt;
        string  metadata;         // JSON metadata (title, description, etc.)
    }

    // ── State ───────────────────────────────────────────
    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;
    mapping(address => uint256[]) public userEscrows;
    mapping(bytes32 => uint256) public agreementEscrows;  // agreementHash => escrowId

    uint256 public platformFeeBps = 50;  // 0.5% fee
    address public platformWallet;
    address public owner;

    // ── Events ──────────────────────────────────────────
    event EscrowCreated(uint256 indexed id, address indexed partyA, address indexed partyB, uint256 amount, bytes32 agreementHash);
    event Deposited(uint256 indexed id, address indexed party, uint256 amount);
    event EscrowFunded(uint256 indexed id);
    event ApprovalGiven(uint256 indexed id, address indexed party, address releaseTo);
    event EscrowReleased(uint256 indexed id, address indexed releaseTo, uint256 amount);
    event EscrowRefunded(uint256 indexed id);
    event DisputeRaised(uint256 indexed id, address indexed raisedBy);
    event DisputeResolved(uint256 indexed id, address indexed releaseTo);
    event EscrowCancelled(uint256 indexed id);

    // ── Modifiers ───────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyParty(uint256 _id) {
        require(msg.sender == escrows[_id].partyA || msg.sender == escrows[_id].partyB, "Not a party");
        _;
    }

    modifier onlyArbiter(uint256 _id) {
        require(msg.sender == escrows[_id].arbiter, "Not arbiter");
        _;
    }

    modifier inState(uint256 _id, EscrowState _state) {
        require(escrows[_id].state == _state, "Invalid state");
        _;
    }

    // ── Constructor ─────────────────────────────────────
    constructor(address _platformWallet) {
        owner = msg.sender;
        platformWallet = _platformWallet;
    }

    // ══════════════════════════════════════════════════════
    //   CREATE ESCROW
    // ══════════════════════════════════════════════════════

    function createEscrow(
        EscrowType _type,
        address _partyB,
        address _arbiter,
        address _token,           // address(0) for ETH
        uint256 _amount,
        bytes32 _agreementHash,
        string calldata _agreementId,
        string calldata _metadata
    ) external payable nonReentrant returns (uint256) {
        require(_partyB != address(0), "Invalid party B");
        require(_partyB != msg.sender, "Cannot escrow with yourself");
        require(_amount > 0, "Amount must be > 0");
        require(_arbiter != address(0), "Arbiter required");

        escrowCount++;
        uint256 id = escrowCount;

        escrows[id] = Escrow({
            id: id,
            escrowType: _type,
            state: EscrowState.Created,
            partyA: msg.sender,
            partyB: _partyB,
            arbiter: _arbiter,
            token: _token,
            amount: _amount,
            partyADeposit: 0,
            partyBDeposit: 0,
            agreementHash: _agreementHash,
            agreementId: _agreementId,
            partyAApproved: false,
            partyBApproved: false,
            releaseTo: address(0),
            createdAt: block.timestamp,
            resolvedAt: 0,
            metadata: _metadata
        });

        userEscrows[msg.sender].push(id);
        userEscrows[_partyB].push(id);

        if (_agreementHash != bytes32(0)) {
            agreementEscrows[_agreementHash] = id;
        }

        // Auto-deposit if ETH sent
        if (msg.value > 0) {
            require(_token == address(0), "Send ETH only for ETH escrows");
            _deposit(id, msg.sender, msg.value);
        }

        emit EscrowCreated(id, msg.sender, _partyB, _amount, _agreementHash);
        return id;
    }

    // ══════════════════════════════════════════════════════
    //   DEPOSIT
    // ══════════════════════════════════════════════════════

    function deposit(uint256 _id) external payable nonReentrant onlyParty(_id) {
        Escrow storage e = escrows[_id];
        require(e.state == EscrowState.Created, "Not accepting deposits");

        if (e.token == address(0)) {
            require(msg.value > 0, "Send ETH");
            _deposit(_id, msg.sender, msg.value);
        } else {
            revert("Use depositToken for ERC-20");
        }
    }

    function depositToken(uint256 _id, uint256 _amount) external nonReentrant onlyParty(_id) {
        Escrow storage e = escrows[_id];
        require(e.state == EscrowState.Created, "Not accepting deposits");
        require(e.token != address(0), "Use deposit() for ETH");
        require(_amount > 0, "Amount must be > 0");

        IERC20(e.token).safeTransferFrom(msg.sender, address(this), _amount);
        _deposit(_id, msg.sender, _amount);
    }

    function _deposit(uint256 _id, address _party, uint256 _amount) internal {
        Escrow storage e = escrows[_id];

        if (_party == e.partyA) {
            e.partyADeposit += _amount;
        } else {
            e.partyBDeposit += _amount;
        }

        emit Deposited(_id, _party, _amount);

        // Check if fully funded
        if (e.partyADeposit + e.partyBDeposit >= e.amount) {
            e.state = EscrowState.Funded;
            emit EscrowFunded(_id);
        }
    }

    // ══════════════════════════════════════════════════════
    //   APPROVE & RELEASE
    // ══════════════════════════════════════════════════════

    /// @notice Both parties must approve. Each specifies who should receive funds.
    function approve(uint256 _id, address _releaseTo) external onlyParty(_id) inState(_id, EscrowState.Funded) {
        Escrow storage e = escrows[_id];
        require(_releaseTo == e.partyA || _releaseTo == e.partyB, "Release to must be a party");

        if (msg.sender == e.partyA) {
            e.partyAApproved = true;
        } else {
            e.partyBApproved = true;
        }

        e.releaseTo = _releaseTo;
        emit ApprovalGiven(_id, msg.sender, _releaseTo);

        // If both approved same party, auto-release
        if (e.partyAApproved && e.partyBApproved) {
            _release(_id, _releaseTo);
        }
    }

    // ══════════════════════════════════════════════════════
    //   DISPUTES
    // ══════════════════════════════════════════════════════

    function raiseDispute(uint256 _id) external onlyParty(_id) inState(_id, EscrowState.Funded) {
        escrows[_id].state = EscrowState.Disputed;
        emit DisputeRaised(_id, msg.sender);
    }

    function resolveDispute(uint256 _id, address _releaseTo) external onlyArbiter(_id) inState(_id, EscrowState.Disputed) {
        Escrow storage e = escrows[_id];
        require(_releaseTo == e.partyA || _releaseTo == e.partyB, "Must release to a party");

        e.state = EscrowState.Resolved;
        e.resolvedAt = block.timestamp;
        emit DisputeResolved(_id, _releaseTo);

        _release(_id, _releaseTo);
    }

    // ══════════════════════════════════════════════════════
    //   CANCEL (only before funded)
    // ══════════════════════════════════════════════════════

    function cancel(uint256 _id) external onlyParty(_id) inState(_id, EscrowState.Created) nonReentrant {
        Escrow storage e = escrows[_id];
        e.state = EscrowState.Cancelled;

        // Refund any partial deposits
        if (e.token == address(0)) {
            if (e.partyADeposit > 0) payable(e.partyA).transfer(e.partyADeposit);
            if (e.partyBDeposit > 0) payable(e.partyB).transfer(e.partyBDeposit);
        } else {
            if (e.partyADeposit > 0) IERC20(e.token).safeTransfer(e.partyA, e.partyADeposit);
            if (e.partyBDeposit > 0) IERC20(e.token).safeTransfer(e.partyB, e.partyBDeposit);
        }

        emit EscrowCancelled(_id);
    }

    // ══════════════════════════════════════════════════════
    //   INTERNAL RELEASE
    // ══════════════════════════════════════════════════════

    function _release(uint256 _id, address _to) internal nonReentrant {
        Escrow storage e = escrows[_id];
        e.state = EscrowState.Released;
        e.releaseTo = _to;
        e.resolvedAt = block.timestamp;

        uint256 total = e.partyADeposit + e.partyBDeposit;
        uint256 fee = (total * platformFeeBps) / 10000;
        uint256 payout = total - fee;

        if (e.token == address(0)) {
            payable(_to).transfer(payout);
            if (fee > 0) payable(platformWallet).transfer(fee);
        } else {
            IERC20(e.token).safeTransfer(_to, payout);
            if (fee > 0) IERC20(e.token).safeTransfer(platformWallet, fee);
        }

        emit EscrowReleased(_id, _to, payout);
    }

    // ══════════════════════════════════════════════════════
    //   VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════

    function getEscrow(uint256 _id) external view returns (Escrow memory) {
        return escrows[_id];
    }

    function getUserEscrows(address _user) external view returns (uint256[] memory) {
        return userEscrows[_user];
    }

    function getEscrowByAgreement(bytes32 _hash) external view returns (Escrow memory) {
        uint256 id = agreementEscrows[_hash];
        require(id > 0, "No escrow for this agreement");
        return escrows[id];
    }

    // ══════════════════════════════════════════════════════
    //   ADMIN
    // ══════════════════════════════════════════════════════

    function setFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Max 5%");
        platformFeeBps = _feeBps;
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        platformWallet = _wallet;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}

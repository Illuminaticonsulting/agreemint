/**
 * AgreeMint — PDF Generation Engine
 *
 * Generates professional, legally-formatted PDF documents
 * from agreement content with headers, footers, signatures,
 * verification certificates, and watermarks.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLATFORM = process.env.PLATFORM_NAME || 'AgreeMint';

// ─── Generate Agreement PDF ────────────────────────────
function generatePDF(agreement, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: agreement.title,
          Author: PLATFORM,
          Subject: `${agreement.type} Agreement`,
          Creator: `${PLATFORM} AI Agreement Platform`,
          Producer: PLATFORM,
          CreationDate: new Date(agreement.createdAt)
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const pageWidth = doc.page.width - 144; // margins

      // ─── Header ──────────────────────────────────
      doc.fontSize(9)
         .fillColor('#888888')
         .text(`${PLATFORM} | Document ID: ${agreement.id}`, 72, 30, { align: 'right', width: pageWidth });

      doc.moveTo(72, 55).lineTo(72 + pageWidth, 55).strokeColor('#cccccc').lineWidth(0.5).stroke();

      // ─── Status Watermark ────────────────────────
      if (agreement.status === 'draft') {
        doc.save();
        doc.fontSize(60).fillColor('#f0f0f0').fillOpacity(0.3);
        doc.translate(300, 500);
        doc.rotate(-45, { origin: [0, 0] });
        doc.text('DRAFT', -100, -30);
        doc.restore();
        doc.fillOpacity(1);
      }

      // ─── Title ───────────────────────────────────
      doc.fontSize(22).fillColor('#1a1a1a').font('Helvetica-Bold')
         .text(agreement.title, 72, 80, { align: 'center', width: pageWidth });

      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#666666').font('Helvetica')
         .text(`Type: ${formatType(agreement.type)} | Created: ${new Date(agreement.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

      if (agreement.jurisdiction) {
        doc.fontSize(10).fillColor('#666666')
           .text(`Governing Law: ${agreement.jurisdiction}`, { align: 'center' });
      }

      doc.moveDown(0.5);
      doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).strokeColor('#1a1a1a').lineWidth(1).stroke();
      doc.moveDown(1);

      // ─── Parties ─────────────────────────────────
      if (agreement.parties && agreement.parties.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a1a')
           .text('PARTIES', { underline: true });
        doc.moveDown(0.3);

        agreement.parties.forEach((party, i) => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
             .text(`${i + 1}. ${party.name}${party.role ? ` ("${party.role}")` : ''}`);
          if (party.email) {
            doc.fontSize(9).font('Helvetica').fillColor('#666666')
               .text(`   Email: ${party.email}`);
          }
          if (party.address) {
            doc.fontSize(9).font('Helvetica').fillColor('#666666')
               .text(`   Address: ${party.address}`);
          }
          doc.moveDown(0.3);
        });

        doc.moveDown(0.5);
        doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).strokeColor('#dddddd').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
      }

      // ─── Agreement Body ──────────────────────────
      const lines = agreement.content.split('\n');
      for (const line of lines) {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          addPageHeader(doc, agreement, pageWidth);
        }

        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith('# ')) {
          doc.moveDown(0.5);
          doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a')
             .text(trimmed.replace(/^# /, ''));
          doc.moveDown(0.3);
        } else if (trimmed.startsWith('## ')) {
          doc.moveDown(0.5);
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a')
             .text(trimmed.replace(/^## /, ''));
          doc.moveDown(0.3);
        } else if (trimmed.startsWith('### ')) {
          doc.moveDown(0.3);
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333')
             .text(trimmed.replace(/^### /, ''));
          doc.moveDown(0.2);
        } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a')
             .text(trimmed.replace(/\*\*/g, ''));
        } else if (trimmed === '---' || trimmed === '***') {
          doc.moveDown(0.3);
          doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).strokeColor('#dddddd').lineWidth(0.5).stroke();
          doc.moveDown(0.3);
        } else if (trimmed === '') {
          doc.moveDown(0.3);
        } else {
          // Clean markdown formatting for PDF
          let clean = trimmed
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/\[RISK NOTE\]/g, '[RISK NOTE]');

          doc.fontSize(10).font('Helvetica').fillColor('#333333')
             .text(clean, { align: 'justify', lineGap: 2 });
        }
      }

      // ─── Signature Section ───────────────────────
      doc.addPage();
      addPageHeader(doc, agreement, pageWidth);

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a')
         .text('SIGNATURE PAGE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#333333')
         .text('IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date last signed below.', { align: 'center' });
      doc.moveDown(1.5);

      const parties = agreement.parties || [{ name: 'Party A' }, { name: 'Party B' }];
      const sigWidth = pageWidth / 2 - 20;

      parties.forEach((party, i) => {
        const xPos = i % 2 === 0 ? 72 : 72 + sigWidth + 40;
        const yStart = doc.y;

        if (i > 0 && i % 2 === 0) {
          doc.moveDown(2);
        }

        const sig = (agreement.signatures || []).find(s => s.email === party.email);

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a')
           .text(party.name || `Party ${i + 1}`, xPos, i % 2 === 0 ? doc.y : yStart, { width: sigWidth });

        if (party.role) {
          doc.fontSize(9).font('Helvetica').fillColor('#666666')
             .text(`"${party.role}"`, xPos, doc.y, { width: sigWidth });
        }

        doc.moveDown(1);
        const lineY = doc.y;
        doc.moveTo(xPos, lineY).lineTo(xPos + sigWidth, lineY).strokeColor('#333333').lineWidth(1).stroke();

        if (sig) {
          // Render actual signature image if available
          if (sig.signatureImage && sig.signatureImage.startsWith('data:image/png;base64,')) {
            try {
              const imgData = sig.signatureImage.replace(/^data:image\/png;base64,/, '');
              const imgBuffer = Buffer.from(imgData, 'base64');
              doc.image(imgBuffer, xPos, lineY + 3, { width: Math.min(sigWidth, 180), height: 50, fit: [Math.min(sigWidth, 180), 50] });
              doc.moveDown(3.5);
            } catch (e) {
              // Fallback to text if image rendering fails
              doc.fontSize(10).font('Helvetica-Oblique').fillColor('#1a6b3c')
                 .text(`Digitally signed by ${sig.name}`, xPos, lineY + 5, { width: sigWidth });
            }
          } else {
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('#1a6b3c')
               .text(`Digitally signed by ${sig.name}`, xPos, lineY + 5, { width: sigWidth });
          }
          const methodLabel = sig.method === 'draw' ? 'Hand-drawn' : sig.method === 'type' ? 'Typed' : sig.method === 'upload' ? 'Uploaded' : sig.method === 'wallet' ? 'Wallet' : 'Click-to-sign';
          doc.fontSize(8).fillColor('#666666')
             .text(`${methodLabel} | ${new Date(sig.signedAt).toLocaleString()} | Hash: ${sig.hash.substring(0, 16)}...`, xPos, doc.y, { width: sigWidth });
        } else {
          doc.fontSize(9).font('Helvetica').fillColor('#999999')
             .text('Signature', xPos, lineY + 5, { width: sigWidth });
        }

        doc.moveDown(0.3);
        doc.moveTo(xPos, doc.y + 15).lineTo(xPos + sigWidth, doc.y + 15).strokeColor('#333333').lineWidth(0.5).stroke();
        doc.fontSize(9).font('Helvetica').fillColor('#999999')
           .text('Date', xPos, doc.y + 20, { width: sigWidth });
      });

      // ─── Verification Footer ────────────────────
      doc.moveDown(4);
      doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc.moveDown(0.5);

      doc.fontSize(8).font('Helvetica').fillColor('#999999')
         .text(`Document ID: ${agreement.id}`, { align: 'center' });
      doc.text(`Content Hash (SHA-256): ${agreement.contentHash}`, { align: 'center' });
      doc.text(`Generated by ${PLATFORM} | Cryptographically verified`, { align: 'center' });
      doc.text(`This document is legally binding under the ESIGN Act (15 U.S.C. 7001) and UETA.`, { align: 'center' });

      // ─── Finalize ────────────────────────────────
      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

function addPageHeader(doc, agreement, pageWidth) {
  doc.fontSize(8).fillColor('#999999').font('Helvetica')
     .text(`${agreement.title} | ${agreement.id}`, 72, 30, { align: 'right', width: pageWidth });
  doc.moveTo(72, 48).lineTo(72 + pageWidth, 48).strokeColor('#eeeeee').lineWidth(0.5).stroke();
  doc.y = 60;
}

function formatType(type) {
  const map = {
    'nda-mutual': 'Mutual NDA',
    'nda-unilateral': 'Unilateral NDA',
    'msa': 'Master Service Agreement',
    'sow': 'Statement of Work',
    'sla': 'Service Level Agreement',
    'employment': 'Employment Agreement',
    'contractor': 'Independent Contractor Agreement',
    'partnership': 'Partnership Agreement',
    'investment-safe': 'SAFE Agreement',
    'investment-convertible': 'Convertible Note',
    'licensing': 'Licensing Agreement',
    'ip-assignment': 'IP Assignment Agreement',
    'advisory': 'Advisory Agreement',
    'terms-of-service': 'Terms of Service',
    'privacy-policy': 'Privacy Policy',
    'jv': 'Joint Venture Agreement',
    'llc-operating': 'LLC Operating Agreement',
    'non-compete': 'Non-Compete Agreement',
    'board-resolution': 'Board Resolution',
    'custom': 'Custom Agreement'
  };
  return map[type] || type;
}

// ─── Generate Verification Certificate PDF ─────────────
function generateCertificatePDF(certificate, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 72, bottom: 72, left: 72, right: 72 } });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const pageWidth = doc.page.width - 144;

      // Border
      doc.rect(50, 50, doc.page.width - 100, doc.page.height - 100).strokeColor('#1a1a1a').lineWidth(2).stroke();
      doc.rect(55, 55, doc.page.width - 110, doc.page.height - 110).strokeColor('#cccccc').lineWidth(0.5).stroke();

      doc.moveDown(3);
      doc.fontSize(28).font('Helvetica-Bold').fillColor('#1a1a1a')
         .text('CERTIFICATE OF VERIFICATION', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').fillColor('#666666')
         .text(`${PLATFORM} Cryptographic Verification`, { align: 'center' });

      doc.moveDown(2);
      doc.moveTo(150, doc.y).lineTo(doc.page.width - 150, doc.y).strokeColor('#1a1a1a').lineWidth(1).stroke();
      doc.moveDown(1.5);

      doc.fontSize(11).font('Helvetica').fillColor('#333333');

      const fields = [
        ['Certificate ID', certificate.certificateId],
        ['Document ID', certificate.documentId],
        ['Document Title', certificate.title],
        ['Document Type', formatType(certificate.type)],
        ['Created', new Date(certificate.createdAt).toLocaleString()],
        ['Document Hash (SHA-256)', certificate.documentHash],
        ['Integrity Status', certificate.integrityStatus],
        ['Verified At', new Date(certificate.verifiedAt).toLocaleString()],
      ];

      fields.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}:`, 100, doc.y, { continued: true, width: 150 });
        doc.font('Helvetica').text(` ${value}`, { width: pageWidth - 80 });
        doc.moveDown(0.3);
      });

      if (certificate.signatures && certificate.signatures.length > 0) {
        doc.moveDown(1);
        doc.fontSize(13).font('Helvetica-Bold').text('Digital Signatures', 100);
        doc.moveDown(0.5);

        certificate.signatures.forEach((sig, i) => {
          doc.fontSize(10).font('Helvetica-Bold').text(`${i + 1}. ${sig.name}`, 110);
          doc.font('Helvetica').fillColor('#666666')
             .text(`   Email: ${sig.email}`, 110)
             .text(`   Signed: ${new Date(sig.signedAt).toLocaleString()}`, 110)
             .text(`   Hash: ${sig.signatureHash.substring(0, 32)}...`, 110);
          doc.moveDown(0.5);
          doc.fillColor('#333333');
        });
      }

      doc.moveDown(2);
      doc.moveTo(150, doc.y).lineTo(doc.page.width - 150, doc.y).strokeColor('#1a1a1a').lineWidth(1).stroke();
      doc.moveDown(1);

      doc.fontSize(9).font('Helvetica').fillColor('#999999')
         .text(`This certificate was generated by ${PLATFORM} and cryptographically signed.`, { align: 'center' })
         .text('The document hash above can be used to verify the document has not been altered.', { align: 'center' })
         .text(`Certificate Signature: ${certificate.certificateSignature}`, { align: 'center' });

      doc.end();
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePDF, generateCertificatePDF, formatType };

const PDFDocument = require("pdfkit");

function formatStudentName(user) {
  if (!user) return "Student";
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ");
  return fullName || user.username || user.email || "Student";
}

function buildCertificatePdfBuffer({
  studentName,
  courseTitle,
  certificateNumber,
  issuedAt,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor("#1e293b")
      .text("Certificate of Completion", { align: "center" });

    doc.moveDown(1.5);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#64748b")
      .text("This certifies that", { align: "center" });

    doc.moveDown(0.75);

    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#0f172a")
      .text(studentName, { align: "center" });

    doc.moveDown(0.75);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#64748b")
      .text("has successfully completed", { align: "center" });

    doc.moveDown(0.75);

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#312e81")
      .text(courseTitle, { align: "center", width: pageWidth });

    doc.moveDown(2);

    doc
      .moveTo(doc.page.margins.left + 80, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right - 80, doc.y)
      .strokeColor("#cbd5e1")
      .stroke();

    doc.moveDown(1.5);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#475569")
      .text(`Certificate #${certificateNumber}`, { align: "center" });

    doc.moveDown(0.5);

    doc.text(
      `Issued ${new Date(issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      { align: "center" },
    );

    doc.moveDown(2);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#6366f1")
      .text("Handiz Architecture Academy", { align: "center" });

    doc.end();
  });
}

module.exports = {
  buildCertificatePdfBuffer,
  formatStudentName,
};

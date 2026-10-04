type EbookPdfPage = { image?: string; number?: number };

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function safeName(value: string) {
  return (value || "ebook").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "ebook";
}

async function imageToJpeg(url: string, pageNumber: number) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo descargar la imagen de la página ${pageNumber}.`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error(`No se pudo preparar la página ${pageNumber}.`);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error(`No se pudo convertir la página ${pageNumber}.`)), "image/jpeg", 0.95));
    return { bytes: new Uint8Array(await jpeg.arrayBuffer()), width: canvas.width, height: canvas.height };
  } finally { bitmap.close(); }
}

function buildPdf(images: { bytes: Uint8Array; width: number; height: number }[]) {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let length = 0;
  const push = (data: string | Uint8Array) => { const b = typeof data === "string" ? enc.encode(data) : data; chunks.push(b); length += b.length; };
  push("%PDF-1.4\n%VYRAL\n");
  let next = 1;
  const catalog = next++, pagesRoot = next++;
  const pageObjs: number[] = [], contentObjs: number[] = [], imageObjs: number[] = [];
  for (let i = 0; i < images.length; i++) { pageObjs.push(next++); contentObjs.push(next++); imageObjs.push(next++); }
  const start = (n: number) => { offsets[n] = length; push(`${n} 0 obj\n`); };
  start(catalog); push(`<< /Type /Catalog /Pages ${pagesRoot} 0 R >>\nendobj\n`);
  start(pagesRoot); push(`<< /Type /Pages /Count ${images.length} /Kids [${pageObjs.map(n => `${n} 0 R`).join(" ")}] >>\nendobj\n`);
  images.forEach((img, i) => {
    // Cada página usa la misma relación de aspecto de su imagen: cero crop, cero stretch.
    const pw = 595.276;
    const ph = pw * (img.height / img.width);
    start(pageObjs[i]);
    push(`<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 ${pw.toFixed(3)} ${ph.toFixed(3)}] /Resources << /XObject << /Im${i + 1} ${imageObjs[i]} 0 R >> >> /Contents ${contentObjs[i]} 0 R >>\nendobj\n`);
    const stream = `q\n${pw.toFixed(3)} 0 0 ${ph.toFixed(3)} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
    start(contentObjs[i]); push(`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);
    start(imageObjs[i]); push(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`); push(img.bytes); push("\nendstream\nendobj\n");
  });
  const xref = length;
  push(`xref\n0 ${next}\n0000000000 65535 f \n`);
  for (let i = 1; i < next; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${next} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return concat(chunks);
}

export async function downloadEbookPdf(title: string, pages: EbookPdfPage[], onProgress?: (done: number, total: number) => void) {
  if (!pages.length || pages.some(p => !p.image)) throw new Error("Faltan imágenes para crear el PDF.");
  const images = [] as { bytes: Uint8Array; width: number; height: number }[];
  for (let i = 0; i < pages.length; i++) {
    images.push(await imageToJpeg(pages[i].image!, pages[i].number || i + 1));
    onProgress?.(i + 1, pages.length);
  }
  const pdf = buildPdf(images);
  if (pdf.length < 5 || new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") throw new Error("El PDF final no superó la validación.");
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

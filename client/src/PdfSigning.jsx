import React, { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import SignatureCanvas from "react-signature-canvas";
import { Document, Page, pdfjs } from "react-pdf";
import Draggable from "react-draggable";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PdfSigning = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [unsignedPdfData, setUnsignedPdfData] = useState(null);
  const [signedPdfData, setSignedPdfData] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const signatureCanvasRef = useRef(null);
  const [signature, setSignature] = useState({
    position: { x: null, y: null },
    type: "draw",
    data: "",
    showCanvasPopup: false,
  });

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setUnsignedPdfData(null);
    setSignedPdfData(null);
  };

  const createSignatureImageData = () => {
    switch (signature.type) {
      case "draw":
        return signatureCanvasRef.current.toDataURL();
      case "type":
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 100;
        const ctx = canvas.getContext("2d");
        ctx.font = "30px Arial";
        ctx.fillText(signature.data, 20, 50);
        return canvas.toDataURL();
      default:
        throw new Error(`Invalid signature type: ${signature.type}`);
    }
  };

  const handleSignPdf = async () => {
    try {
      const pdfBytes = await fetch(URL.createObjectURL(selectedFile)).then(
        (res) => res.arrayBuffer()
      );
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const [page] = pdfDoc.getPages();
      const { width, height } = page.getSize();
      const signatureImageData = createSignatureImageData();
      const signatureImage = await pdfDoc.embedPng(signatureImageData);
      const signatureWidth = 100;
      const signatureHeight =
        (signatureImage.height / signatureImage.width) * signatureWidth;
      const { x, y } = signature.position;
      page.drawImage(signatureImage, {
        x: x - signatureWidth / 2,
        y: height - y - signatureHeight / 2,
        width: signatureWidth,
        height: signatureHeight,
      });
      const pdfBytesWithSignature = await pdfDoc.save();
      setSignedPdfData(new Uint8Array(pdfBytesWithSignature));
    } catch (error) {
      console.error("Error signing PDF:", error);
    }
  };

  const handlePdfClick = (event) => {
    const placeholderWidth = 300;
    const placeholderHeight = 50;
    const centeredPosition = {
      x: position.x + placeholderWidth / 2,
      y: position.y + placeholderHeight / 2,
    };
    setSignature((prev) => ({
      ...prev,
      position: centeredPosition,
      showCanvasPopup: true,
    }));
  };

  const handleTypeSignatureChange = (e) => {
    setSignature((prev) => ({ ...prev, data: e.target.value }));
  };

  const handleSignatureTypeChange = (e) => {
    setSignature((prev) => ({ ...prev, type: e.target.value }));
  };

  const onStop = (event, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  return (
    <div className="flex flex-col items-center justify-center relative">
      <h2 className="font-bold text-xl py-5">PDF Signing</h2>
      <div className="ring-1 p-10 rounded-xl">
        <input type="file" accept=".pdf" onChange={handleFileChange} />
      </div>
      <br />
      {selectedFile && !unsignedPdfData && !signedPdfData && (
        <div>
          <Document file={URL.createObjectURL(selectedFile)}>
            <Page pageNumber={1} onClick={handlePdfClick}>
              <Draggable onStop={onStop}>
                <div
                  style={{
                    position: "absolute",
                    top: position.y, // Updated Y position
                    left: position.x, // Updated X position
                    width: 300,
                    height: 50,
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    zIndex: 100,
                  }}
                >
                  Draggable signature placeholder
                </div>
              </Draggable>
            </Page>
          </Document>
          <br />
        </div>
      )}
      {selectedFile && !signedPdfData && signature.showCanvasPopup && (
        <div className="canvas-popup">
          <div className="canvas-popup-content border border-slate-600/20">
            {signature.type === "draw" && (
              <SignatureCanvas
                ref={signatureCanvasRef}
                canvasProps={{ width: 300, height: 150 }}
              />
            )}
            {signature.type === "type" && (
              <input
                className="p-2 rounded ring-1 ring-slate-600/20 mb-2"
                type="text"
                value={signature.data}
                onChange={handleTypeSignatureChange}
              />
            )}
            <div className="flex flex-col items-start gap-y-0.5 pb-5">
              <label>
                <input
                  type="radio"
                  value="draw"
                  checked={signature.type === "draw"}
                  onChange={handleSignatureTypeChange}
                />
                Draw
              </label>
              <label>
                <input
                  type="radio"
                  value="type"
                  checked={signature.type === "type"}
                  onChange={handleSignatureTypeChange}
                />
                Type
              </label>
            </div>
            <div className="flex items-center gap-x-5 justify-between">
              <button
                className="w-1/2 bg-green-500 text-white p-2 rounded"
                onClick={handleSignPdf}
              >
                Sign PDF
              </button>
              <button
                className="w-1/2 bg-red-500 text-white p-2 rounded"
                onClick={() =>
                  setSignature((prev) => ({ ...prev, showCanvasPopup: false }))
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {signedPdfData && (
        <div>
          <Document
            file={{ data: signedPdfData }}
            onLoadError={(error) => console.error("Error loading PDF:", error)}
          >
            <Page pageNumber={1} />
          </Document>
        </div>
      )}
    </div>
  );
};

export default PdfSigning;

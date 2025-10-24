import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [vectorLines, setVectorLines] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [threshold, setThreshold] = useState(100);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          setProcessedImage(null);
          setVectorLines([]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const extractWalls = () => {
    if (!originalImage) return;

    setProcessing(true);

    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size to match image
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;

      // Draw original image
      ctx.drawImage(originalImage, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Process pixels: keep only dark pixels (walls), make others white
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate brightness
        const brightness = (r + g + b) / 3;

        // If pixel is darker than threshold, keep it (walls)
        // Otherwise, make it white
        if (brightness > threshold) {
          data[i] = 255;     // R
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
        } else {
          // Keep dark pixels darker for better contrast
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }

      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);

      // Save processed image
      setProcessedImage(canvas.toDataURL());
      setProcessing(false);
    }, 100);
  };

  const vectorizeWalls = () => {
    if (!processedImage) {
      alert('Please extract walls first!');
      return;
    }

    setProcessing(true);

    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Create binary matrix
      const binaryMatrix = [];
      for (let y = 0; y < canvas.height; y++) {
        binaryMatrix[y] = [];
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          binaryMatrix[y][x] = brightness < 128 ? 1 : 0;
        }
      }

      // Detect lines using a simplified approach
      // Find horizontal and vertical line segments
      const lines = [];

      // Horizontal line detection
      for (let y = 0; y < canvas.height; y += 5) {
        let lineStart = null;
        for (let x = 0; x < canvas.width; x++) {
          if (binaryMatrix[y][x] === 1) {
            if (lineStart === null) {
              lineStart = x;
            }
          } else {
            if (lineStart !== null && (x - lineStart) > 10) {
              lines.push({
                x1: lineStart,
                y1: y,
                x2: x - 1,
                y2: y,
                type: 'horizontal'
              });
            }
            lineStart = null;
          }
        }
        if (lineStart !== null && (canvas.width - lineStart) > 10) {
          lines.push({
            x1: lineStart,
            y1: y,
            x2: canvas.width - 1,
            y2: y,
            type: 'horizontal'
          });
        }
      }

      // Vertical line detection
      for (let x = 0; x < canvas.width; x += 5) {
        let lineStart = null;
        for (let y = 0; y < canvas.height; y++) {
          if (binaryMatrix[y][x] === 1) {
            if (lineStart === null) {
              lineStart = y;
            }
          } else {
            if (lineStart !== null && (y - lineStart) > 10) {
              lines.push({
                x1: x,
                y1: lineStart,
                x2: x,
                y2: y - 1,
                type: 'vertical'
              });
            }
            lineStart = null;
          }
        }
        if (lineStart !== null && (canvas.height - lineStart) > 10) {
          lines.push({
            x1: x,
            y1: lineStart,
            x2: x,
            y2: canvas.height - 1,
            type: 'vertical'
          });
        }
      }

      setVectorLines(lines);
      setProcessing(false);
    }, 100);
  };

  const downloadSVG = () => {
    if (vectorLines.length === 0) {
      alert('Please vectorize walls first!');
      return;
    }

    const canvas = canvasRef.current;
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <rect width="100%" height="100%" fill="white"/>
  <g stroke="black" stroke-width="2" stroke-linecap="round">
`;

    vectorLines.forEach(line => {
      svgContent += `    <line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}"/>\n`;
    });

    svgContent += `  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evacuation-plan-walls.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Evacuation Plan Wall Vectorizer</h1>
        <p className="subtitle">Upload an evacuation plan to extract and vectorize wall lines</p>

        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current.click()}
          >
            Upload Evacuation Plan
          </button>
        </div>

        {originalImage && (
          <div className="controls">
            <div className="control-group">
              <label>
                Darkness Threshold: {threshold}
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="slider"
                />
              </label>
            </div>

            <div className="button-group">
              <button
                onClick={extractWalls}
                disabled={processing}
                className="process-btn"
              >
                {processing ? 'Processing...' : 'Step 1: Extract Walls'}
              </button>
              <button
                onClick={vectorizeWalls}
                disabled={processing || !processedImage}
                className="process-btn"
              >
                {processing ? 'Processing...' : 'Step 2: Vectorize'}
              </button>
              <button
                onClick={downloadSVG}
                disabled={vectorLines.length === 0}
                className="download-btn"
              >
                Download SVG
              </button>
            </div>
          </div>
        )}

        <div className="preview-container">
          {originalImage && (
            <div className="preview-box">
              <h3>Original Image</h3>
              <img src={originalImage.src} alt="Original" />
            </div>
          )}

          {processedImage && (
            <div className="preview-box">
              <h3>Walls Extracted</h3>
              <img src={processedImage} alt="Processed" />
            </div>
          )}

          {vectorLines.length > 0 && (
            <div className="preview-box">
              <h3>Vectorized ({vectorLines.length} lines)</h3>
              <svg
                width={canvasRef.current?.width || 0}
                height={canvasRef.current?.height || 0}
                viewBox={`0 0 ${canvasRef.current?.width || 0} ${canvasRef.current?.height || 0}`}
                style={{ border: '1px solid #ddd', background: 'white', maxWidth: '100%', height: 'auto' }}
              >
                <rect width="100%" height="100%" fill="white"/>
                <g stroke="black" strokeWidth="2" strokeLinecap="round">
                  {vectorLines.map((line, idx) => (
                    <line
                      key={idx}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                    />
                  ))}
                </g>
              </svg>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default App;

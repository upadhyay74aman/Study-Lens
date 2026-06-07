import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, FileImage, AlertCircle } from 'lucide-react';

export default function UploadZone({ onUpload }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndProcessFile = (file) => {
    setError(null);
    if (!file) return;

    // Check MIME type
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file (PNG, JPG, or JPEG).");
      return;
    }

    // Check size limit (max 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setError("File is too large. Please upload an image smaller than 10MB.");
      return;
    }

    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="upload-zone-wrapper">
      <div 
        className={`upload-area ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="file-input" 
          accept="image/*"
          onChange={handleChange}
        />
        
        <div className="upload-icon-container">
          <Camera size={40} strokeWidth={1.5} />
        </div>
        
        <div className="upload-text">
          <h3>Upload your handwritten notes</h3>
          <p>Drag and drop your JPG or PNG photo here, or click to browse</p>
        </div>

        <button type="button" className="browse-btn" onClick={(e) => {
          e.stopPropagation();
          onButtonClick();
        }}>
          Choose Photo
        </button>

        {error && (
          <div className="error-banner" style={{ margin: '1rem 0 0 0', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <span className="error-title">
              <AlertCircle size={18} />
              {error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

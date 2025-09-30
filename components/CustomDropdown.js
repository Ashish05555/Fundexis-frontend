import React, { useState, useRef, useEffect } from "react";

export default function CustomDropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="dropdown-ui-root">
      <div
        className="dropdown-ui-selected"
        onClick={() => setOpen((o) => !o)}
        tabIndex={0}
      >
        {value || <span className="dropdown-ui-placeholder">{placeholder}</span>}
        <span className="dropdown-ui-arrow">&#9662;</span>
      </div>
      {open && (
        <div className="dropdown-ui-list">
          {options.map((opt) => (
            <div
              key={opt}
              className={`dropdown-ui-option${value === opt ? " selected" : ""}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
      <style>{`
        .dropdown-ui-root {
          position: relative;
          width: 100%;
        }
        .dropdown-ui-selected {
          background: #f7f9fd;
          border: 1.5px solid #d0d6f7;
          border-radius: 9px;
          padding: 0.65rem 0.8rem;
          font-size: 1rem;
          font-family: 'Inter', Arial, sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: border-color 0.2s;
        }
        .dropdown-ui-selected:focus, .dropdown-ui-selected:hover {
          border-color: #1326b5;
        }
        .dropdown-ui-arrow {
          color: #1326b5;
          font-size: 1.2rem;
          margin-left: 10px;
        }
        .dropdown-ui-placeholder {
          color: #b2b5c1;
        }
        .dropdown-ui-list {
          position: absolute;
          top: 110%;
          left: 0;
          width: 100%;
          background: #fff;
          box-shadow: 0 4px 18px rgba(44,56,120,0.10);
          border-radius: 9px;
          border: 1.5px solid #d0d6f7;
          z-index: 10;
          animation: fadeIn 0.17s;
        }
        @keyframes fadeIn {
          from { transform: translateY(-8px); opacity: 0;}
          to { transform: translateY(0); opacity: 1;}
        }
        .dropdown-ui-option {
          padding: 0.7rem 1.1rem;
          font-size: 1rem;
          cursor: pointer;
          color: #26328c;
          font-family: 'Inter', Arial, sans-serif;
          transition: background 0.13s;
        }
        .dropdown-ui-option:hover, .dropdown-ui-option.selected {
          background: #f1f4ff;
          color: #1326b5;
        }
      `}</style>
    </div>
  );
}
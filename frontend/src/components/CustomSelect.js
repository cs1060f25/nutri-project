import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select an option...',
  getOptionLabel = (option) => option.label || option,
  getOptionValue = (option) => option.value !== undefined ? option.value : option,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => getOptionValue(opt) === value);
  const displayText = selectedOption ? getOptionLabel(selectedOption) : placeholder;

  const handleSelect = (option) => {
    const optionValue = getOptionValue(option);
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-wrapper ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="selected-value">{displayText}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="custom-select-dropdown" role="listbox">
          {options.map((option, index) => {
            const optionValue = getOptionValue(option);
            const isSelected = value === optionValue;
            return (
              <div
                key={index}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
                role="option"
                aria-selected={isSelected}
              >
                <div className="option-content">
                  <div className="option-title">{getOptionLabel(option)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;


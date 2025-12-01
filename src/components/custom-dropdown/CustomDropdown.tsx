import React, { useState, useRef, useEffect } from 'react';
import AnimatedList from '../animated-list/AnimatedList';
import './CustomDropdown.css';

interface CustomDropdownProps {
    label?: string;
    placeholder?: string;
    options: string[];
    value?: string;
    onChange: (value: string) => void;
    required?: boolean;
    name?: string;
    className?: string;
    maxHeight?: string;
    width?: string;
    disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
    label,
    placeholder = 'Select an option',
    options,
    value = '',
    onChange,
    required = false,
    name,
    className = '',
    maxHeight = '300px',
    width = '100%',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

    const handleSelect = (item: string) => {
        setSelectedValue(item);
        onChange(item);
        setIsOpen(false);
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className={`custom-dropdown-wrapper ${className}`} ref={dropdownRef} style={{ width }}>
            {label && (
                <label className="dropdown-label">
                    {label} {required && <span className="required">*</span>}
                </label>
            )}

            <div
                className={`dropdown-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={toggleDropdown}
            >
                <span className={selectedValue ? 'dropdown-value' : 'dropdown-placeholder'}>
                    {selectedValue || placeholder}
                </span>
                <span className={`dropdown-arrow ${isOpen ? 'up' : 'down'}`}>▼</span>
            </div>

            {isOpen && !disabled && (
                <div className="dropdown-list-container" style={{ maxHeight }}>
                    <AnimatedList
                        items={options}
                        onItemSelect={handleSelect}
                        showGradients={true}
                        enableArrowNavigation={false}
                        displayScrollbar={true}
                        className="dropdown-animated-list"
                        itemClassName="dropdown-item"
                    />
                </div>
            )}

            {/* Hidden input for form compatibility */}
            <input type="hidden" name={name} value={selectedValue} />
        </div>
    );
};

export default CustomDropdown;

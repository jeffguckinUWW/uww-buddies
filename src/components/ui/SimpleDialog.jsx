import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

/**
 * A simplified dialog component built on top of the Radix UI Dialog
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Function to close the dialog
 * @param {string} props.title - Dialog title
 * @param {string} props.description - Optional dialog description
 * @param {React.ReactNode} props.children - Dialog content
 * @param {React.ReactNode} props.footer - Dialog footer with action buttons
 * @returns {React.ReactNode}
 */
const SimpleDialog = ({ open, onClose, title, description, children, footer }) => {
  if (!open) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="py-4 overflow-y-auto flex-grow">
          {children}
        </div>
        
        <DialogFooter className="flex-shrink-0">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleDialog;
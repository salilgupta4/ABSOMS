import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { FolderOpen, Plus, Search, X, Edit3, Save, XCircle, Trash2, Filter, Download, Upload } from 'lucide-react';
import { projectsService, Project, ProjectStatus, ProjectType, LineItem, MeasurementItem } from '@/services/projectsService';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// Stats Card Component matching OMS style
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md flex items-center h-full">
    <div className={`p-4 rounded-full ${color}`}>
      {icon}
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

// Editable Line Item Component
const EditableLineItem: React.FC<{
  item: LineItem;
  projectId: string;
  productId: string;
  onUpdate: () => void;
  onDelete: (itemId: string) => void;
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  onTabToNext?: () => void;
  onAddNewLine?: () => void;
  isLastItem?: boolean;
}> = ({ item, projectId, productId, onUpdate, onDelete, setProjects, onTabToNext, onAddNewLine, isLastItem }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editData, setEditData] = useState(item);

  // Update local state when item prop changes
  React.useEffect(() => {
    setEditData(item);
  }, [item]);

  // Auto-edit if item has empty description (newly created)
  React.useEffect(() => {
    if (!item.description) {
      setIsEditing(true);
      setEditingField('description');
    }
  }, [item.description]);

  const handleSave = async () => {
    try {
      // Get current project data
      const projects = await projectsService.getAllProjects();
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Update the specific item
      const updatedProject = {
        ...project,
        products: project.products.map(p => 
          p.id === productId 
            ? { 
                ...p, 
                items: p.items.map(i => i.id === item.id ? editData : i)
              }
            : p
        )
      };

      // Update local state first for instant response
      if (setProjects) {
        setProjects(prevProjects => 
          prevProjects.map(proj => 
            proj.id === projectId ? updatedProject : proj
          )
        );
      }

      // Then update backend
      await projectsService.updateProject(projectId, updatedProject);
      setIsEditing(false);
      setEditingField(null);
    } catch (error) {
      console.error('Error updating line item:', error);
      alert('Error updating line item');
      // Revert local state on error
      setEditData(item);
    }
  };

  const handleCancel = () => {
    setEditData(item);
    setIsEditing(false);
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      // Define field order for Tab navigation
      const fields = ['date', 'description', 'type', 'amount'];
      const currentIndex = fields.indexOf(fieldName);
      
      if (e.shiftKey) {
        // Shift+Tab: go to previous field
        if (currentIndex > 0) {
          handleSave();
          setTimeout(() => {
            setEditingField(fields[currentIndex - 1]);
            setIsEditing(true);
          }, 0);
        }
      } else {
        // Tab: go to next field or next item
        if (currentIndex < fields.length - 1) {
          handleSave();
          setTimeout(() => {
            setEditingField(fields[currentIndex + 1]);
            setIsEditing(true);
          }, 0);
        } else {
          // We're at the last field
          handleSave();
          if (isLastItem && onAddNewLine) {
            // Add new line if this is the last item
            setTimeout(() => onAddNewLine(), 100);
          } else if (onTabToNext) {
            // Move to next item
            setTimeout(() => onTabToNext(), 100);
          }
        }
      }
    }
  };

  const handleFieldClick = (fieldName: string) => {
    setIsEditing(true);
    setEditingField(fieldName);
  };

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 group hover:bg-slate-50 dark:hover:bg-slate-750">
      <td className="py-2">
        {isEditing && editingField === 'date' ? (
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'date')}
            onBlur={handleSave}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('date')}
          >
            {formatDateForDisplay(item.date)}
          </span>
        )}
      </td>
      <td className="py-2">
        {isEditing && editingField === 'description' ? (
          <input
            type="text"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'description')}
            onBlur={handleSave}
            autoFocus
            placeholder="Enter description"
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('description')}
          >
            {item.description || 'Click to add description'}
          </span>
        )}
      </td>
      <td className="py-2">
        {isEditing && editingField === 'type' ? (
          <select
            value={editData.type}
            onChange={(e) => setEditData({ ...editData, type: e.target.value as 'revenue' | 'cost' })}
            onKeyDown={(e) => handleKeyDown(e, 'type')}
            onBlur={handleSave}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="revenue">Revenue</option>
            <option value="cost">Cost</option>
          </select>
        ) : (
          <span 
            className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-75 ${
              item.type === 'revenue' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}
            onClick={() => handleFieldClick('type')}
          >
            {item.type}
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {isEditing && editingField === 'amount' ? (
          <input
            type="number"
            step="0.01"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) || 0 })}
            onKeyDown={(e) => handleKeyDown(e, 'amount')}
            onBlur={handleSave}
            autoFocus
            placeholder="0.00"
            className="w-24 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('amount')}
          >
            {projectsService.formatCurrency(item.amount)}
          </span>
        )}
      </td>
      <td className="py-2 text-center">
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this line item?')) {
                onDelete(item.id);
              }
            }}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Add Line Item Modal Component  
const AddLineItemModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (itemData: Omit<LineItem, 'id'>) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'revenue' as 'revenue' | 'cost'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return;
    }

    onSubmit({
      date: formData.date,
      description: formData.description.trim(),
      amount: Number(formData.amount) || 0,
      type: formData.type
    });

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'revenue'
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Add Line Item</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'revenue' | 'cost' })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="revenue">Revenue</option>
                <option value="cost">Cost</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} className="flex-1 bg-slate-500 hover:bg-slate-600">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Item
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Editable Category Name Component
const EditableCategoryName: React.FC<{
  productId: string;
  productName: string;
  projectId: string;
  onUpdate: () => void;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}> = ({ productId, productName, projectId, onUpdate, setProjects }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(productName);

  const handleSave = async () => {
    try {
      // Get current project data
      const projects = await projectsService.getAllProjects();
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedProject = {
        ...project,
        products: project.products.map(p => 
          p.id === productId ? { ...p, name: editName } : p
        )
      };

      // Update local state first
      setProjects(prevProjects => 
        prevProjects.map(proj => 
          proj.id === projectId ? updatedProject : proj
        )
      );

      // Then update backend
      await projectsService.updateProject(projectId, updatedProject);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating category name:', error);
      alert('Error updating category name');
    }
  };

  const handleCancel = () => {
    setEditName(productName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <>
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="text-lg font-semibold bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-primary outline-none text-slate-800 dark:text-slate-100 px-1"
        />
      ) : (
        <h4 
          className="text-lg font-semibold text-slate-800 dark:text-slate-100 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 px-1 py-1 rounded"
          onClick={() => setIsEditing(true)}
          title="Click to edit category name"
        >
          {productName}
        </h4>
      )}
    </>
  );
};

// Editable Measurement Item Component
const EditableMeasurementItem: React.FC<{
  measurement: MeasurementItem;
  projectId: string;
  measurementRate: number;
  onUpdate: () => void;
  onDelete: (measurementId: string) => void;
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  onTabToNext?: () => void;
  onAddNewLine?: () => void;
  isLastItem?: boolean;
}> = ({ measurement, projectId, measurementRate, onUpdate, onDelete, setProjects, onTabToNext, onAddNewLine, isLastItem }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editData, setEditData] = useState(measurement);

  // Update local state when measurement prop changes
  React.useEffect(() => {
    setEditData(measurement);
  }, [measurement]);

  // Auto-edit if measurement has empty description (newly created)
  React.useEffect(() => {
    if (!measurement.oldDis) {
      setIsEditing(true);
      setEditingField('oldDis');
    }
  }, [measurement.oldDis]);

  const handleSave = async () => {
    try {
      // Get current project data
      const projects = await projectsService.getAllProjects();
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.measurements) return;

      // Update the specific measurement
      const updatedProject = {
        ...project,
        measurements: project.measurements.map(m => 
          m.id === measurement.id ? editData : m
        )
      };

      // Update local state first for instant response
      if (setProjects) {
        setProjects(prevProjects => 
          prevProjects.map(proj => 
            proj.id === projectId ? updatedProject : proj
          )
        );
      }

      await projectsService.updateProject(projectId, updatedProject);
      setIsEditing(false);
      setEditingField(null);
    } catch (error) {
      console.error('Error updating measurement:', error);
      alert('Error updating measurement');
      // Revert local state on error
      setEditData(measurement);
    }
  };

  const handleCancel = () => {
    setEditData(measurement);
    setIsEditing(false);
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      // Define field order for Tab navigation
      const fields = ['date', 'oldDis', 'oldWidth', 'oldHeight', 'oldQty', 'newWidth', 'newHeight', 'newDis', 'newQty'];
      const currentIndex = fields.indexOf(fieldName);
      
      if (e.shiftKey) {
        // Shift+Tab: go to previous field
        if (currentIndex > 0) {
          handleSave();
          setTimeout(() => {
            setEditingField(fields[currentIndex - 1]);
            setIsEditing(true);
          }, 0);
        }
      } else {
        // Tab: go to next field or next item
        if (currentIndex < fields.length - 1) {
          handleSave();
          setTimeout(() => {
            setEditingField(fields[currentIndex + 1]);
            setIsEditing(true);
          }, 0);
        } else {
          // We're at the last field
          handleSave();
          if (isLastItem && onAddNewLine) {
            // Add new line if this is the last item
            setTimeout(() => onAddNewLine(), 100);
          } else if (onTabToNext) {
            // Move to next item
            setTimeout(() => onTabToNext(), 100);
          }
        }
      }
    }
  };

  const handleFieldClick = (fieldName: string) => {
    setIsEditing(true);
    setEditingField(fieldName);
  };

  const oldSqm = (editData.oldWidth / 1000) * (editData.oldHeight / 1000) * editData.oldQty;
  const newSqm = (editData.newWidth / 1000) * (editData.newHeight / 1000) * editData.newQty;
  const revenue = oldSqm * measurementRate;

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 group hover:bg-slate-50 dark:hover:bg-slate-750">
      <td className="py-2">
        {isEditing && editingField === 'date' ? (
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'date')}
            onBlur={handleSave}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('date')}
          >
            {formatDateForDisplay(measurement.date)}
          </span>
        )}
      </td>
      <td className="py-2">
        {isEditing && editingField === 'oldDis' ? (
          <input
            type="text"
            value={editData.oldDis}
            onChange={(e) => setEditData({ ...editData, oldDis: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'oldDis')}
            onBlur={handleSave}
            autoFocus
            placeholder="Enter description"
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('oldDis')}
          >
            {measurement.oldDis || 'Click to add description'}
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {isEditing && editingField === 'oldWidth' ? (
          <input
            type="number"
            value={editData.oldWidth}
            onChange={(e) => setEditData({ ...editData, oldWidth: Number(e.target.value) || 0 })}
            onKeyDown={(e) => handleKeyDown(e, 'oldWidth')}
            onBlur={handleSave}
            autoFocus
            placeholder="0"
            className="w-20 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('oldWidth')}
          >
            {measurement.oldWidth}mm
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {isEditing && editingField === 'oldHeight' ? (
          <input
            type="number"
            value={editData.oldHeight}
            onChange={(e) => setEditData({ ...editData, oldHeight: Number(e.target.value) || 0 })}
            onKeyDown={(e) => handleKeyDown(e, 'oldHeight')}
            onBlur={handleSave}
            autoFocus
            placeholder="0"
            className="w-20 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('oldHeight')}
          >
            {measurement.oldHeight}mm
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {isEditing && editingField === 'oldQty' ? (
          <input
            type="number"
            value={editData.oldQty}
            onChange={(e) => setEditData({ ...editData, oldQty: Number(e.target.value) || 0 })}
            onKeyDown={(e) => handleKeyDown(e, 'oldQty')}
            onBlur={handleSave}
            autoFocus
            placeholder="0"
            className="w-16 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('oldQty')}
          >
            {measurement.oldQty}
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        <span className="text-sm">{oldSqm.toFixed(3)}</span>
      </td>
      <td className="py-2 text-right">
        {isEditing && editingField === 'newWidth' ? (
          <input
            type="number"
            value={editData.newWidth}
            onChange={(e) => setEditData({ ...editData, newWidth: Number(e.target.value) || 0 })}
            onKeyDown={(e) => handleKeyDown(e, 'newWidth')}
            onBlur={handleSave}
            autoFocus
            placeholder="0"
            className="w-20 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('newWidth')}
          >
            {measurement.newWidth}mm
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {isEditing && editingField === 'newHeight' ? (
          <input
            type="number"
            value={editData.newHeight}
            onChange={(e) => setEditData({ ...editData, newHeight: Number(e.target.value) || 0 })}
            onKeyDown={(e) => handleKeyDown(e, 'newHeight')}
            onBlur={handleSave}
            autoFocus
            placeholder="0"
            className="w-20 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('newHeight')}
          >
            {measurement.newHeight}mm
          </span>
        )}
      </td>
      <td className="py-2">
        {isEditing && editingField === 'newDis' ? (
          <input
            type="text"
            value={editData.newDis}
            onChange={(e) => setEditData({ ...editData, newDis: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, 'newDis')}
            onBlur={handleSave}
            autoFocus
            placeholder="Enter description"
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('newDis')}
          >
            {measurement.newDis || 'Click to add description'}
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {isEditing && editingField === 'newQty' ? (
          <input
            type="number"
            value={editData.newQty}
            onChange={(e) => setEditData({ ...editData, newQty: Number(e.target.value) || 0 })}
            onKeyDown={(e) => handleKeyDown(e, 'newQty')}
            onBlur={handleSave}
            autoFocus
            placeholder="0"
            className="w-16 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
            onClick={() => handleFieldClick('newQty')}
          >
            {measurement.newQty}
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        <span className="text-sm">{newSqm.toFixed(3)}</span>
      </td>
      <td className="py-2 text-right">
        <span className="text-sm font-medium">{projectsService.formatCurrency(revenue)}</span>
      </td>
      <td className="py-2 text-center">
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this measurement?')) {
                onDelete(measurement.id);
              }
            }}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Create Project Modal Component
const CreateProjectModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (project: Omit<Project, 'id' | 'products' | 'measurements' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    orderNumber: '',
    status: 'Planned' as ProjectStatus,
    projectType: 'Financial' as ProjectType,
    estimatedRevenue: '',
    estimatedCost: '',
    measurementRate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.client.trim() || !formData.orderNumber.trim()) {
      alert('Please fill in all required fields (Name, Client, Order Number)');
      return;
    }
    
    const projectData: any = {
      name: formData.name.trim(),
      client: formData.client.trim(),
      orderNumber: formData.orderNumber.trim(),
      status: formData.status,
      projectType: formData.projectType,
      estimatedCost: Number(formData.estimatedCost) || 0,
    };

    if (formData.projectType === 'Financial') {
      projectData.estimatedRevenue = Number(formData.estimatedRevenue) || 0;
    } else {
      projectData.measurementRate = Number(formData.measurementRate) || 0;
    }

    onSubmit(projectData);
    
    // Reset form
    setFormData({
      name: '',
      client: '',
      orderNumber: '',
      status: 'Planned',
      projectType: 'Financial',
      estimatedRevenue: '',
      estimatedCost: '',
      measurementRate: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create New Project</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Client *
            </label>
            <input
              type="text"
              required
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Order Number *
            </label>
            <input
              type="text"
              required
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value as ProjectType })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="Financial">Financial</option>
                <option value="Measurement">Measurement</option>
              </select>
            </div>
          </div>

          {formData.projectType === 'Financial' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Revenue
              </label>
              <input
                type="number"
                value={formData.estimatedRevenue}
                onChange={(e) => setFormData({ ...formData, estimatedRevenue: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Measurement Rate (per SQM)
              </label>
              <input
                type="number"
                value={formData.measurementRate}
                onChange={(e) => setFormData({ ...formData, measurementRate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estimated Cost
            </label>
            <input
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} className="flex-1 bg-slate-500 hover:bg-slate-600">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Projects Grid Component with inline editing
const ProjectsGrid: React.FC<{ 
  projects: Project[]; 
  onRefresh: () => void;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}> = ({ projects, onRefresh, onEdit, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Project>>({});
  const [sortField, setSortField] = useState<keyof Project>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [currentSearch, setCurrentSearch] = useState('');
  
  const navigate = useNavigate();

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setEditData(project);
  };

  const handleSave = async () => {
    if (!editingId || !editData) return;
    
    try {
      await projectsService.updateProject(editingId, editData);
      await onRefresh();
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete project "${projectName}"?`)) {
      try {
        await projectsService.deleteProject(projectId);
        await onRefresh();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project');
      }
    }
  };

  const filteredAndSortedProjects = projects
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(currentSearch.toLowerCase()) || 
                          p.client.toLowerCase().includes(currentSearch.toLowerCase()) ||
                          p.orderNumber.toLowerCase().includes(currentSearch.toLowerCase());
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      {/* Grid Header with Search and Filters */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="search"
                placeholder="Search projects..."
                value={currentSearch}
                onChange={(e) => setCurrentSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100 w-full sm:w-64"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'all')}
                className="pl-10 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100 appearance-none"
              >
                <option value="all">All Status</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Project Name
                  {sortField === 'name' && (
                    <span className={`text-primary ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>↑</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                onClick={() => handleSort('client')}
              >
                <div className="flex items-center gap-2">
                  Client
                  {sortField === 'client' && (
                    <span className={`text-primary ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>↑</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                onClick={() => handleSort('orderNumber')}
              >
                <div className="flex items-center gap-2">
                  Order Number
                  {sortField === 'orderNumber' && (
                    <span className={`text-primary ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>↑</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {sortField === 'status' && (
                    <span className={`text-primary ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>↑</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                onClick={() => handleSort('projectType')}
              >
                <div className="flex items-center gap-2">
                  Type
                  {sortField === 'projectType' && (
                    <span className={`text-primary ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>↑</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Gross Profit
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {filteredAndSortedProjects.map(project => {
              const { grossProfit } = projectsService.calculateProjectTotals(project);
              const isEditing = editingId === project.id;
              
              let statusClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
              if (project.status === 'Completed') {
                statusClass = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
              } else if (project.status === 'In Progress') {
                statusClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
              }
              
              const profitClass = grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
              
              return (
                <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
                      />
                    ) : (
                      <div className="cursor-pointer hover:text-primary" onClick={() => navigate(`/projects/${project.id}`)}>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{project.name}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.client || ''}
                        onChange={(e) => setEditData({ ...editData, client: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
                      />
                    ) : (
                      <div className="text-sm text-slate-900 dark:text-slate-100">{project.client}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.orderNumber || ''}
                        onChange={(e) => setEditData({ ...editData, orderNumber: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
                      />
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400">{project.orderNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <select
                        value={editData.status || project.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value as ProjectStatus })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
                      >
                        <option value="Planned">Planned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                        {project.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <select
                        value={editData.projectType || project.projectType}
                        onChange={(e) => setEditData({ ...editData, projectType: e.target.value as ProjectType })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
                      >
                        <option value="Financial">Financial</option>
                        <option value="Measurement">Measurement</option>
                      </select>
                    ) : (
                      <span className="text-sm text-slate-900 dark:text-slate-100">{project.projectType}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-medium ${profitClass}`}>
                      {projectsService.formatCurrency(grossProfit)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(project)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id, project.name)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredAndSortedProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen size={64} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600 dark:text-slate-400">No projects found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

// Dashboard Component
const ProjectsDashboard: React.FC<{ projects: Project[]; onRefresh: () => void }> = ({ projects, onRefresh }) => {
  const [currentSearch, setCurrentSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'products' | 'measurements' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('Creating project with data:', projectData);
      
      const fullProjectData: any = {
        ...projectData,
        products: []
      };
      
      // Only add measurements array for Measurement projects
      if (projectData.projectType === 'Measurement') {
        fullProjectData.measurements = [];
      }
      
      console.log('Full project data:', fullProjectData);
      
      const newProject = await projectsService.createProject(fullProjectData);
      console.log('Project created successfully:', newProject);
      
      await onRefresh();
      setIsCreateModalOpen(false);
      
      alert('Project created successfully!');
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditProject = (project: Project) => {
    // Handle project editing logic
    console.log('Edit project:', project);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await projectsService.deleteProject(projectId);
      await onRefresh();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(projects, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `projects_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting projects:', error);
      alert('Error exporting projects');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedProjects: Project[] = JSON.parse(content);
        
        // Validate the imported data structure
        if (!Array.isArray(importedProjects)) {
          alert('Invalid file format. Expected an array of projects.');
          return;
        }

        // Create new projects with new IDs to avoid conflicts
        for (const project of importedProjects) {
          const projectData = {
            ...project,
            // Remove ID fields to let the service generate new ones
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            products: project.products.map(p => ({
              ...p,
              id: `prod-${Date.now()}-${Math.random()}`,
              items: p.items.map(i => ({
                ...i,
                id: `item-${Date.now()}-${Math.random()}`
              }))
            })),
            measurements: project.measurements?.map(m => ({
              ...m,
              id: `meas-${Date.now()}-${Math.random()}`
            }))
          };

          await projectsService.createProject(projectData);
        }

        await onRefresh();
        alert(`Successfully imported ${importedProjects.length} projects!`);
        
        // Reset the input
        event.target.value = '';
      } catch (error) {
        console.error('Error importing projects:', error);
        alert('Error importing projects. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
  };



  const totalProfit = projects.reduce((sum, p) => sum + projectsService.calculateProjectTotals(p).grossProfit, 0);
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;

  return (
    <div className="p-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Projects"
          value={projects.length}
          icon={<FolderOpen size={24} />}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
        />
        <StatCard
          title="Active Projects"
          value={activeProjects}
          icon={<FolderOpen size={24} />}
          color="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
        />
        <StatCard
          title="Total Gross Profit"
          value={projectsService.formatCurrency(totalProfit)}
          icon={<FolderOpen size={24} />}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          <FolderOpen className="inline mr-3" size={32} />
          Projects Management
        </h1>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
            id="import-input"
          />
          <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
            <button 
              onClick={() => document.getElementById('import-input')?.click()}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm flex items-center gap-1 transition-colors"
              title="Import Projects"
            >
              <Upload size={16} />
              Import
            </button>
            <button 
              onClick={handleExport}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 text-sm flex items-center gap-1 border-l border-slate-300 dark:border-slate-600 transition-colors"
              title="Export Projects"
            >
              <Download size={16} />
              Export
            </button>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="whitespace-nowrap">
            <Plus size={18} className="mr-2" />
            Create Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <ProjectsGrid 
        projects={projects} 
        onRefresh={onRefresh}
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

// Project Detail Component
// Utility function for consistent date formatting
const formatDateForDisplay = (dateInput: string | Date): string => {
  let date: Date;
  
  if (typeof dateInput === 'string') {
    // Handle different date formats
    if (dateInput.includes('-')) {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD format
          date = new Date(dateInput);
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY format
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          date = new Date(dateInput);
        }
      } else {
        date = new Date(dateInput);
      }
    } else if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY format
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          date = new Date(dateInput);
        }
      } else {
        date = new Date(dateInput);
      }
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

// Utility function to parse date from various formats to YYYY-MM-DD for storage
const parseDateForStorage = (dateInput: string): string => {
  if (!dateInput || !dateInput.trim()) {
    return new Date().toISOString().split('T')[0];
  }
  
  const trimmed = dateInput.trim();
  
  // Try parsing different formats
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD format (already correct)
        const testDate = new Date(trimmed);
        return isNaN(testDate.getTime()) ? new Date().toISOString().split('T')[0] : trimmed;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY format
        const testDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        return isNaN(testDate.getTime()) ? new Date().toISOString().split('T')[0] : testDate.toISOString().split('T')[0];
      }
    }
  } else if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY format
        const testDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        return isNaN(testDate.getTime()) ? new Date().toISOString().split('T')[0] : testDate.toISOString().split('T')[0];
      }
    }
  }
  
  // Fallback: try parsing as-is
  const testDate = new Date(trimmed);
  return isNaN(testDate.getTime()) ? new Date().toISOString().split('T')[0] : testDate.toISOString().split('T')[0];
};

const ProjectDetail: React.FC<{ projects: Project[]; onRefresh: () => void; setProjects: React.Dispatch<React.SetStateAction<Project[]>> }> = ({ projects, onRefresh, setProjects }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Project Not Found</h4>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">The requested project could not be found.</p>
          <Button onClick={() => navigate('/projects')}>
            ← Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const totals = projectsService.calculateProjectTotals(project);

  // CSV Export/Import functions
  const exportFinancialLinesToCSV = () => {
    try {
      let csvContent = 'Product Category,Date,Description,Type,Amount\n';
      
      project.products.forEach(product => {
        product.items.forEach(item => {
          csvContent += `"${product.name}","${item.date}","${item.description}","${item.type}",${item.amount}\n`;
        });
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${project.name}_financial_lines_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting financial lines:', error);
      alert('Error exporting financial lines');
    }
  };

  const exportMeasurementsToCSV = () => {
    try {
      if (!project.measurements || project.measurements.length === 0) {
        alert('No measurement data to export');
        return;
      }
      
      let csvContent = 'Date,Old Description,Old Width(mm),Old Height(mm),Old Quantity,Old SQM,New Width(mm),New Height(mm),New Description,New Quantity,New SQM,Rate,Revenue\n';
      
      project.measurements.forEach(measurement => {
        const oldSqm = (measurement.oldWidth / 1000) * (measurement.oldHeight / 1000) * measurement.oldQty;
        const newSqm = (measurement.newWidth / 1000) * (measurement.newHeight / 1000) * measurement.newQty;
        const revenue = oldSqm * (project.measurementRate || 0);
        
        csvContent += `"${formatDateForDisplay(measurement.date)}","${measurement.oldDis}",${measurement.oldWidth},${measurement.oldHeight},${measurement.oldQty},${oldSqm.toFixed(3)},${measurement.newWidth},${measurement.newHeight},"${measurement.newDis}",${measurement.newQty},${newSqm.toFixed(3)},${project.measurementRate || 0},${revenue.toFixed(2)}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${project.name}_measurements_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting measurements:', error);
      alert('Error exporting measurements');
    }
  };

  const importFinancialLinesFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        // Normalize headers by trimming whitespace and removing quotes
        const normalizedHeaders = headers.map(h => h.trim().replace(/"/g, '').toLowerCase());
        const requiredHeaders = ['product category', 'date', 'description', 'type', 'amount'];
        
        const missingHeaders = requiredHeaders.filter(required => 
          !normalizedHeaders.some(header => header === required)
        );
        
        if (missingHeaders.length > 0) {
          alert('Invalid CSV format. Required columns: Product Category, Date, Description, Type, Amount');
          return;
        }

        const newItems: { [key: string]: any[] } = {};
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(val => val.replace(/"/g, ''));
          const [productName, date, description, type, amount] = values;
          
          if (!newItems[productName]) {
            newItems[productName] = [];
          }
          
          newItems[productName].push({
            id: `item-${Date.now()}-${Math.random()}`,
            date: parseDateForStorage(date),
            description: description || '',
            type: type === 'revenue' ? 'revenue' : 'cost',
            amount: parseFloat(amount) || 0
          });
        }

        // Update project with new items
        const updatedProducts = project.products ? [...project.products] : [];
        
        Object.keys(newItems).forEach(productName => {
          let existingProduct = updatedProducts.find(p => p.name === productName);
          
          if (!existingProduct) {
            // Create new product category
            existingProduct = {
              id: `prod-${Date.now()}-${Math.random()}`,
              name: productName,
              items: []
            };
            updatedProducts.push(existingProduct);
          }
          
          // Add new items to the product
          existingProduct.items.push(...newItems[productName]);
        });

        const updatedProject = {
          ...project,
          products: updatedProducts
        };

        setProjects(prevProjects => 
          prevProjects.map(proj => 
            proj.id === project.id ? updatedProject : proj
          )
        );
        
        projectsService.updateProject(project.id, updatedProject);
        alert(`Successfully imported financial lines!`);
        
        // Reset the input
        event.target.value = '';
      } catch (error) {
        console.error('Error importing financial lines:', error);
        alert('Error importing financial lines. Please check the CSV format.');
      }
    };
    
    reader.readAsText(file);
  };

  const importMeasurementsFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        // Normalize headers by trimming whitespace and removing quotes
        const normalizedHeaders = headers.map(h => h.trim().replace(/"/g, '').toLowerCase());
        
        // Support both old and new CSV formats
        const basicRequiredHeaders = ['date', 'description', 'width(mm)', 'height(mm)', 'quantity'];
        const extendedRequiredHeaders = ['date', 'old description', 'old width(mm)', 'old height(mm)', 'old quantity', 'new width(mm)', 'new height(mm)', 'new description', 'new quantity'];
        
        const hasBasicFormat = basicRequiredHeaders.every(required => 
          normalizedHeaders.some(header => header === required)
        );
        
        const hasExtendedFormat = extendedRequiredHeaders.every(required => 
          normalizedHeaders.some(header => header === required)
        );
        
        if (!hasBasicFormat && !hasExtendedFormat) {
          alert('Invalid CSV format. Required columns for basic format: Date, Description, Width(mm), Height(mm), Quantity\nOR for extended format: Date, Old Description, Old Width(mm), Old Height(mm), Old Quantity, New Width(mm), New Height(mm), New Description, New Quantity');
          return;
        }

        const newMeasurements: any[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(val => val.replace(/"/g, ''));
          
          // Use the utility function to parse date consistently
          const parsedDate = parseDateForStorage(values[0]);

          if (hasExtendedFormat) {
            // Extended format: Date, Old Description, Old Width(mm), Old Height(mm), Old Quantity, New Width(mm), New Height(mm), New Description, New Quantity
            const [date, oldDescription, oldWidth, oldHeight, oldQuantity, newWidth, newHeight, newDescription, newQuantity] = values;
            
            newMeasurements.push({
              id: `meas-${Date.now()}-${Math.random()}`,
              date: parsedDate,
              oldDis: oldDescription || '',
              oldWidth: parseFloat(oldWidth) || 0,
              oldHeight: parseFloat(oldHeight) || 0,
              oldQty: parseInt(oldQuantity) || 0,
              newWidth: parseFloat(newWidth) || 0,
              newHeight: parseFloat(newHeight) || 0,
              newDis: newDescription || '',
              newQty: parseInt(newQuantity) || 0
            });
          } else {
            // Basic format: Date, Description, Width(mm), Height(mm), Quantity
            const [date, description, width, height, quantity] = values;
            
            newMeasurements.push({
              id: `meas-${Date.now()}-${Math.random()}`,
              date: parsedDate,
              oldDis: description || '',
              oldWidth: parseFloat(width) || 0,
              oldHeight: parseFloat(height) || 0,
              oldQty: parseInt(quantity) || 0,
              newWidth: 0,
              newHeight: 0,
              newDis: '',
              newQty: 0
            });
          }
        }

        const updatedProject = {
          ...project,
          measurements: [...(project.measurements || []), ...newMeasurements]
        };

        setProjects(prevProjects => 
          prevProjects.map(proj => 
            proj.id === project.id ? updatedProject : proj
          )
        );
        
        projectsService.updateProject(project.id, updatedProject);
        alert(`Successfully imported ${newMeasurements.length} measurements!`);
        
        // Reset the input
        event.target.value = '';
      } catch (error) {
        console.error('Error importing measurements:', error);
        alert('Error importing measurements. Please check the CSV format.');
      }
    };
    
    reader.readAsText(file);
  };

  let statusClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  if (project.status === 'Completed') {
    statusClass = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  } else if (project.status === 'In Progress') {
    statusClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  }

  const DetailCard: React.FC<{ title: string; value: string; color?: string }> = ({ title, value, color = '' }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md text-center">
      <h6 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{title}</h6>
      <p className={`text-2xl font-bold ${color || 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button onClick={() => navigate('/projects')} className="mb-4">
          ← Back to Projects
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Client: {project.client} | Order: {project.orderNumber}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusClass} self-start`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <DetailCard 
          title="Status" 
          value={project.status} 
        />
        <DetailCard 
          title="Total Revenue" 
          value={projectsService.formatCurrency(totals.totalRevenue)}
          color="text-green-600 dark:text-green-400"
        />
        <DetailCard 
          title="Total Cost" 
          value={projectsService.formatCurrency(totals.totalCost)}
          color="text-red-600 dark:text-red-400"
        />
        <DetailCard 
          title="Gross Profit" 
          value={projectsService.formatCurrency(totals.grossProfit)}
          color={totals.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
        />
      </div>

      {/* Project Details */}
      <Card title="Project Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Type: </span>
              <span className="text-slate-600 dark:text-slate-400">{project.projectType}</span>
            </div>
            {project.estimatedRevenue && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Estimated Revenue: </span>
                <span className="text-slate-600 dark:text-slate-400">{projectsService.formatCurrency(project.estimatedRevenue)}</span>
              </div>
            )}
            {project.measurementRate && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Measurement Rate: </span>
                <span className="text-slate-600 dark:text-slate-400">{projectsService.formatCurrency(project.measurementRate)}/SQM</span>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Estimated Cost: </span>
              <span className="text-slate-600 dark:text-slate-400">{projectsService.formatCurrency(project.estimatedCost || 0)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Products/Categories: </span>
              <span className="text-slate-600 dark:text-slate-400">{project.products.length}</span>
            </div>
            {project.measurements && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Measurements: </span>
                <span className="text-slate-600 dark:text-slate-400">{project.measurements.length} entries</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Financial Line Items Section */}
      {project.projectType === 'Financial' && (
        <Card title="Financial Line Items">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Product Categories</h3>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={importFinancialLinesFromCSV}
                  style={{ display: 'none' }}
                  id="financial-import-input"
                />
                <div className="flex border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                  <button
                    onClick={() => document.getElementById('financial-import-input')?.click()}
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1"
                    title="Import Financial Lines from CSV"
                  >
                    <Upload size={12} />
                    Import
                  </button>
                  <button
                    onClick={exportFinancialLinesToCSV}
                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center gap-1 border-l border-slate-300 dark:border-slate-600"
                    title="Export Financial Lines to CSV"
                  >
                    <Download size={12} />
                    Export
                  </button>
                </div>
                <button
                  onClick={() => {
                    const newProduct = {
                      id: `prod-${Date.now()}`,
                      name: 'New Product Category',
                      items: []
                    };
                    const updatedProject = {
                      ...project,
                      products: [...project.products, newProduct]
                    };
                    setProjects(prevProjects => 
                      prevProjects.map(proj => 
                        proj.id === project.id ? updatedProject : proj
                      )
                    );
                    projectsService.updateProject(project.id, updatedProject);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-300 dark:border-slate-600 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Category
                </button>
              </div>
            </div>
            
            {project.products.map(product => (
              <div key={product.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <EditableCategoryName 
                    productId={product.id}
                    productName={product.name}
                    projectId={project.id}
                    onUpdate={onRefresh}
                    setProjects={setProjects}
                  />
                  <div className="flex border border-slate-200 dark:border-slate-600 rounded-md overflow-hidden">
                    <button 
                      onClick={() => {
                        const newItem = {
                          id: `item-${Date.now()}`,
                          date: new Date().toISOString().split('T')[0],
                          description: '',
                          amount: 0,
                          type: 'revenue' as 'revenue' | 'cost'
                        };
                        const updatedProject = {
                          ...project,
                          products: project.products.map(p => 
                            p.id === product.id 
                              ? { ...p, items: [...p.items, newItem] }
                              : p
                          )
                        };
                        setProjects(prevProjects => 
                          prevProjects.map(proj => 
                            proj.id === project.id ? updatedProject : proj
                          )
                        );
                        projectsService.updateProject(project.id, updatedProject);
                      }}
                      className="px-2 py-1 bg-green-50 hover:bg-green-100 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 text-xs flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Revenue
                    </button>
                    <button 
                      onClick={() => {
                        const newItem = {
                          id: `item-${Date.now()}`,
                          date: new Date().toISOString().split('T')[0],
                          description: '',
                          amount: 0,
                          type: 'cost' as 'revenue' | 'cost'
                        };
                        const updatedProject = {
                          ...project,
                          products: project.products.map(p => 
                            p.id === product.id 
                              ? { ...p, items: [...p.items, newItem] }
                              : p
                          )
                        };
                        setProjects(prevProjects => 
                          prevProjects.map(proj => 
                            proj.id === project.id ? updatedProject : proj
                          )
                        );
                        projectsService.updateProject(project.id, updatedProject);
                      }}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-1 border-l border-slate-200 dark:border-slate-600"
                    >
                      <Plus size={12} />
                      Cost
                    </button>
                  </div>
                </div>
                
                {product.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Description</th>
                          <th className="text-left py-2">Type</th>
                          <th className="text-right py-2">Amount</th>
                          <th className="text-center py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.items.map((item, index) => (
                          <EditableLineItem 
                            key={item.id}
                            item={item}
                            projectId={project.id}
                            productId={product.id}
                            onUpdate={onRefresh}
                            setProjects={setProjects}
                            isLastItem={index === product.items.length - 1}
                            onTabToNext={() => {
                              // Focus next item (will be handled automatically by React)
                            }}
                            onAddNewLine={() => {
                              // Add new line of same type as current item
                              const newItem = {
                                id: `item-${Date.now()}`,
                                date: new Date().toISOString().split('T')[0],
                                description: '',
                                amount: 0,
                                type: item.type as 'revenue' | 'cost'
                              };
                              const updatedProject = {
                                ...project,
                                products: project.products.map(p => 
                                  p.id === product.id 
                                    ? { ...p, items: [...p.items, newItem] }
                                    : p
                                )
                              };
                              setProjects(prevProjects => 
                                prevProjects.map(proj => 
                                  proj.id === project.id ? updatedProject : proj
                                )
                              );
                              projectsService.updateProject(project.id, updatedProject);
                            }}
                            onDelete={async (itemId) => {
                              const updatedProject = {
                                ...project,
                                products: project.products.map(p => 
                                  p.id === product.id 
                                    ? { ...p, items: p.items.filter(i => i.id !== itemId) }
                                    : p
                                )
                              };
                              // Update local state first
                              setProjects(prevProjects => 
                                prevProjects.map(proj => 
                                  proj.id === project.id ? updatedProject : proj
                                )
                              );
                              // Then update backend
                              await projectsService.updateProject(project.id, updatedProject);
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No line items yet. Click "Add Line Item" to get started.</p>
                )}
              </div>
            ))}
            
            {project.products.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 mb-4">No product categories yet.</p>
                <Button onClick={async () => {
                  const newProduct = {
                    id: `prod-${Date.now()}`,
                    name: 'New Product Category',
                    items: []
                  };
                  const updatedProject = {
                    ...project,
                    products: [...project.products, newProduct]
                  };
                  await projectsService.updateProject(project.id, updatedProject);
                  await onRefresh();
                  alert('Product category added successfully!');
                }}>
                  Add Product Category
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Financial Line Items Section for Measurement Projects */}
      {project.projectType === 'Measurement' && (
        <Card title="Financial Line Items">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Product Categories</h3>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={importFinancialLinesFromCSV}
                  style={{ display: 'none' }}
                  id="measurement-financial-import-input"
                />
                <div className="flex border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                  <button
                    onClick={() => document.getElementById('measurement-financial-import-input')?.click()}
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1"
                    title="Import Financial Lines from CSV"
                  >
                    <Upload size={12} />
                    Import
                  </button>
                  <button
                    onClick={exportFinancialLinesToCSV}
                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center gap-1 border-l border-slate-300 dark:border-slate-600"
                    title="Export Financial Lines to CSV"
                  >
                    <Download size={12} />
                    Export
                  </button>
                </div>
                <button
                  onClick={() => {
                    const newProduct = {
                      id: `prod-${Date.now()}`,
                      name: 'New Product Category',
                      items: []
                    };
                    const updatedProject = {
                      ...project,
                      products: [...project.products, newProduct]
                    };
                    setProjects(prevProjects => 
                      prevProjects.map(proj => 
                        proj.id === project.id ? updatedProject : proj
                      )
                    );
                    projectsService.updateProject(project.id, updatedProject);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-300 dark:border-slate-600 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Category
                </button>
              </div>
            </div>
            
            {project.products.map(product => (
              <div key={product.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <EditableCategoryName 
                    productId={product.id}
                    productName={product.name}
                    projectId={project.id}
                    onUpdate={onRefresh}
                    setProjects={setProjects}
                  />
                  <div className="flex border border-slate-200 dark:border-slate-600 rounded-md overflow-hidden">
                    <button 
                      onClick={() => {
                        const newItem = {
                          id: `item-${Date.now()}`,
                          date: new Date().toISOString().split('T')[0],
                          description: '',
                          amount: 0,
                          type: 'revenue' as 'revenue' | 'cost'
                        };
                        const updatedProject = {
                          ...project,
                          products: project.products.map(p => 
                            p.id === product.id 
                              ? { ...p, items: [...p.items, newItem] }
                              : p
                          )
                        };
                        // Update locally first for instant response
                        setProjects(prevProjects => 
                          prevProjects.map(proj => 
                            proj.id === project.id ? updatedProject : proj
                          )
                        );
                        // Then update backend
                        projectsService.updateProject(project.id, updatedProject);
                      }}
                      className="px-2 py-1 bg-green-50 hover:bg-green-100 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 text-xs flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Revenue
                    </button>
                    <button 
                      onClick={() => {
                        const newItem = {
                          id: `item-${Date.now()}`,
                          date: new Date().toISOString().split('T')[0],
                          description: '',
                          amount: 0,
                          type: 'cost' as 'revenue' | 'cost'
                        };
                        const updatedProject = {
                          ...project,
                          products: project.products.map(p => 
                            p.id === product.id 
                              ? { ...p, items: [...p.items, newItem] }
                              : p
                          )
                        };
                        // Update locally first for instant response
                        setProjects(prevProjects => 
                          prevProjects.map(proj => 
                            proj.id === project.id ? updatedProject : proj
                          )
                        );
                        // Then update backend
                        projectsService.updateProject(project.id, updatedProject);
                      }}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-1 border-l border-slate-200 dark:border-slate-600"
                    >
                      <Plus size={12} />
                      Cost
                    </button>
                  </div>
                </div>
                
                {product.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Description</th>
                          <th className="text-left py-2">Type</th>
                          <th className="text-right py-2">Amount</th>
                          <th className="text-center py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.items.map((item, index) => (
                          <EditableLineItem 
                            key={item.id}
                            item={item}
                            projectId={project.id}
                            productId={product.id}
                            onUpdate={onRefresh}
                            setProjects={setProjects}
                            isLastItem={index === product.items.length - 1}
                            onTabToNext={() => {
                              // Focus next item (will be handled automatically by React)
                            }}
                            onAddNewLine={() => {
                              // Add new line of same type as current item
                              const newItem = {
                                id: `item-${Date.now()}`,
                                date: new Date().toISOString().split('T')[0],
                                description: '',
                                amount: 0,
                                type: item.type as 'revenue' | 'cost'
                              };
                              const updatedProject = {
                                ...project,
                                products: project.products.map(p => 
                                  p.id === product.id 
                                    ? { ...p, items: [...p.items, newItem] }
                                    : p
                                )
                              };
                              setProjects(prevProjects => 
                                prevProjects.map(proj => 
                                  proj.id === project.id ? updatedProject : proj
                                )
                              );
                              projectsService.updateProject(project.id, updatedProject);
                            }}
                            onDelete={async (itemId) => {
                              const updatedProject = {
                                ...project,
                                products: project.products.map(p => 
                                  p.id === product.id 
                                    ? { ...p, items: p.items.filter(i => i.id !== itemId) }
                                    : p
                                )
                              };
                              // Update local state first
                              setProjects(prevProjects => 
                                prevProjects.map(proj => 
                                  proj.id === project.id ? updatedProject : proj
                                )
                              );
                              // Then update backend
                              await projectsService.updateProject(project.id, updatedProject);
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No line items yet. Click "Add Line Item" to get started.</p>
                )}
              </div>
            ))}
            
            {project.products.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 mb-4">No product categories yet.</p>
                <Button onClick={() => {
                  const newProduct = {
                    id: `prod-${Date.now()}`,
                    name: 'New Product Category',
                    items: []
                  };
                  const updatedProject = {
                    ...project,
                    products: [...project.products, newProduct]
                  };
                  setProjects(prevProjects => 
                    prevProjects.map(proj => 
                      proj.id === project.id ? updatedProject : proj
                    )
                  );
                  projectsService.updateProject(project.id, updatedProject);
                }}>
                  Add Product Category
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Measurement Items Section */}
      {project.projectType === 'Measurement' && (
        <Card title="Measurement Entries">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-slate-600 dark:text-slate-400">Track measurement data for this project</p>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={importMeasurementsFromCSV}
                  style={{ display: 'none' }}
                  id="measurements-import-input"
                />
                <div className="flex border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                  <button
                    onClick={() => document.getElementById('measurements-import-input')?.click()}
                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1"
                    title="Import Measurements from CSV"
                  >
                    <Upload size={12} />
                    Import
                  </button>
                  <button
                    onClick={exportMeasurementsToCSV}
                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center gap-1 border-l border-slate-300 dark:border-slate-600"
                    title="Export Measurements to CSV"
                  >
                    <Download size={12} />
                    Export
                  </button>
                </div>
                <button
                  onClick={() => {
                    const newMeasurement = {
                      id: `meas-${Date.now()}`,
                      date: new Date().toISOString().split('T')[0],
                      oldWidth: 0,
                      oldHeight: 0,
                      oldDis: '',
                      oldQty: 0,
                      newWidth: 0,
                      newHeight: 0,
                      newDis: '',
                      newQty: 0
                    };
                    const updatedProject = {
                      ...project,
                      measurements: [...(project.measurements || []), newMeasurement]
                    };
                    setProjects(prevProjects => 
                      prevProjects.map(proj => 
                        proj.id === project.id ? updatedProject : proj
                      )
                    );
                    projectsService.updateProject(project.id, updatedProject);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-md border border-slate-300 dark:border-slate-600 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Entry
                </button>
              </div>
            </div>

            {project.measurements && project.measurements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Old Description</th>
                      <th className="text-right py-2">Old Width</th>
                      <th className="text-right py-2">Old Height</th>
                      <th className="text-right py-2">Old Qty</th>
                      <th className="text-right py-2">Old SQM</th>
                      <th className="text-right py-2">New Width</th>
                      <th className="text-right py-2">New Height</th>
                      <th className="text-left py-2">New Description</th>
                      <th className="text-right py-2">New Qty</th>
                      <th className="text-right py-2">New SQM</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-center py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.measurements.map((measurement, index) => (
                      <EditableMeasurementItem
                        key={measurement.id}
                        measurement={measurement}
                        projectId={project.id}
                        measurementRate={project.measurementRate || 0}
                        onUpdate={onRefresh}
                        setProjects={setProjects}
                        isLastItem={index === project.measurements!.length - 1}
                        onTabToNext={() => {
                          // Focus next item (will be handled automatically by React)
                        }}
                        onAddNewLine={() => {
                          // Add new measurement line
                          const newMeasurement = {
                            id: `meas-${Date.now()}`,
                            date: new Date().toISOString().split('T')[0],
                            oldDis: '',
                            oldWidth: 0,
                            oldHeight: 0,
                            oldQty: 0,
                            newWidth: 0,
                            newHeight: 0,
                            newDis: '',
                            newQty: 0
                          };
                          const updatedProject = {
                            ...project,
                            measurements: [...(project.measurements || []), newMeasurement]
                          };
                          setProjects(prevProjects => 
                            prevProjects.map(proj => 
                              proj.id === project.id ? updatedProject : proj
                            )
                          );
                          projectsService.updateProject(project.id, updatedProject);
                        }}
                        onDelete={async (measurementId) => {
                          const updatedProject = {
                            ...project,
                            measurements: (project.measurements || []).filter(m => m.id !== measurementId)
                          };
                          await projectsService.updateProject(project.id, updatedProject);
                          await onRefresh();
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">No measurement entries yet. Click "Add Measurement Entry" to get started.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

// Main Module Component
const ProjectsModule: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await projectsService.getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="projects-module-container">
      <Routes>
        <Route 
          path="/" 
          element={<ProjectsDashboard projects={projects} onRefresh={loadProjects} />} 
        />
        <Route 
          path="/:id" 
          element={<ProjectDetail projects={projects} onRefresh={loadProjects} setProjects={setProjects} />} 
        />
      </Routes>
    </div>
  );
};

export default ProjectsModule;
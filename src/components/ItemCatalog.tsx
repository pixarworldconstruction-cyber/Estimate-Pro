import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { Plus, Search, Trash2, Edit2, Package, IndianRupee, Percent } from 'lucide-react';
import { Item } from '../types';
import ConfirmModal from './ConfirmModal';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { OperationType, handleFirestoreError } from '../firebase';

export default function ItemCatalog() {
  const { staff } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Item>>({
    name: '',
    price: 0,
    gst: 18,
    unit: 'Nos',
    gstSlab: 18
  });
  const [customUnit, setCustomUnit] = useState('');

  const units = ['Nos', 'Kg', 'Mtr', 'Sq.Ft', 'Cu.Ft', 'Bag', 'Ltr', 'Box', 'Set', 'Custom'];
  const gstSlabs: (0 | 5 | 12 | 18 | 28)[] = [0, 5, 12, 18, 28];

  useEffect(() => {
    if (!staff) return;
    const q = query(
      collection(db, 'items'), 
      where('companyId', '==', staff.companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sortedItems = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Item))
        .sort((a, b) => a.name.localeCompare(b.name));
      setItems(sortedItems);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'items'));
    return () => unsubscribe();
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.companyId) return;

    const dataToSave = {
      ...formData,
      unit: formData.unit === 'Custom' ? customUnit : formData.unit,
      companyId: staff.companyId
    };

    if (selectedItem) {
      await updateDoc(doc(db, 'items', selectedItem.id), dataToSave);
    } else {
      await addDoc(collection(db, 'items'), dataToSave);
    }
    setIsModalOpen(false);
    setSelectedItem(null);
    setFormData({ name: '', price: 0, gst: 18 });
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await deleteDoc(doc(db, 'items', itemToDelete));
    setItemToDelete(null);
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900">Item Catalog</h1>
        <button
          onClick={() => {
            setSelectedItem(null);
            setFormData({ name: '', price: 0, gst: 18, unit: 'Nos', gstSlab: 18 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Price (Base)</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">GST %</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-4 text-sm font-bold text-zinc-600 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-zinc-50 transition-all group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-zinc-900">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase">{item.unit || 'Nos'}</span>
                </td>
                <td className="px-6 py-4 text-zinc-600">{formatCurrency(item.price)}</td>
                <td className="px-6 py-4 text-zinc-600">{item.gst}%</td>
                <td className="px-6 py-4 font-bold text-primary">
                  {formatCurrency(item.price * (1 + item.gst / 100))}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => {
                        setSelectedItem(item);
                        setFormData(item);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-zinc-400 hover:text-primary hover:bg-zinc-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setItemToDelete(item.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="p-12 text-center text-zinc-400 italic">
            No items found.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6">
              {selectedItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Item Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Unit</label>
                <div className="flex flex-col gap-2">
                  <select
                    value={units.includes(formData.unit || '') ? formData.unit : 'Custom'}
                    onChange={e => {
                      if (e.target.value !== 'Custom') {
                        setFormData(prev => ({ ...prev, unit: e.target.value }));
                      } else {
                        setFormData(prev => ({ ...prev, unit: 'Custom' }));
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary bg-white"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {(formData.unit === 'Custom' || !units.includes(formData.unit || '')) && (
                    <input
                      type="text"
                      placeholder="Enter Custom Unit"
                      value={formData.unit === 'Custom' ? '' : formData.unit}
                      onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                      required
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">Base Price (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">GST Slab (%)</label>
                <div className="grid grid-cols-5 gap-2">
                  {gstSlabs.map(slab => (
                    <button
                      key={slab}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gst: slab, gstSlab: slab }))}
                      className={cn(
                        "py-2 rounded-xl border font-bold transition-all",
                        formData.gst === slab ? "bg-primary text-white border-primary" : "bg-white text-zinc-600 border-zinc-200 hover:border-primary"
                      )}
                    >
                      {slab}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                  {selectedItem ? 'Update Item' : 'Save Item'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-100 text-zinc-600 py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Item?"
        message="Are you sure you want to delete this item from the catalog?"
        confirmText="Delete"
      />
    </div>
  );
}

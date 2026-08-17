import React, { useState } from 'react';
import { Category, DatePrecision } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BookOpen, ArrowLeft, ArrowRight, Clock } from 'lucide-react';

export interface StoryFormData {
  title: string;
  category_id: string;
  date_type: DatePrecision;
  year: number;
  end_year?: number;
  exact_date?: string;
  story: string;
}

interface StoryFormStepProps {
  initialData: StoryFormData;
  categories: Category[];
  onNext: (data: StoryFormData) => void;
  onBack: () => void;
}

export const StoryFormStep: React.FC<StoryFormStepProps> = ({
  initialData,
  categories,
  onNext,
  onBack,
}) => {
  const [formData, setFormData] = useState<StoryFormData>(initialData);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.title || formData.title.trim().length < 5) {
      setErrorMsg('Title must be at least 5 characters long.');
      return;
    }

    if (!formData.category_id) {
      setErrorMsg('Please select a category for this memory.');
      return;
    }

    if (!formData.story || formData.story.trim().length < 30) {
      setErrorMsg('Story body must be at least 30 characters long to capture details.');
      return;
    }

    if (!formData.year || formData.year < 1900 || formData.year > 2100) {
      setErrorMsg('Please enter a valid year.');
      return;
    }

    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-heading font-bold text-black flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span>Step 2: Story & Time Anchor</span>
        </h2>
        <p className="text-sm text-charcoal-dark">
          Title your memory and describe the events, people, and feelings associated with this place.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Memory Title */}
      <Input
        label="Memory Title *"
        type="text"
        placeholder="e.g. My First Day at Yaba Hostel in 1984"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      {/* Category Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-dark mb-1">Category *</label>
        <select
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} — {cat.description}
            </option>
          ))}
        </select>
      </div>

      {/* Time Anchor Precision Selector */}
      <div className="space-y-3 p-4 bg-gray-50 border border-border rounded-xl">
        <label className="block text-xs font-bold text-charcoal-dark uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-primary" />
          <span>Time Anchor Precision *</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['EXACT_YEAR', 'EXACT_DATE', 'DECADE', 'DATE_RANGE'] as DatePrecision[]).map((prec) => (
            <button
              type="button"
              key={prec}
              onClick={() => setFormData({ ...formData, date_type: prec })}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                formData.date_type === prec
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-charcoal-dark border-border hover:bg-gray-100'
              }`}
            >
              {prec.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Dynamic Year/Date inputs based on precision */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-charcoal-dark mb-1">
              {formData.date_type === 'DATE_RANGE' ? 'Start Year *' : 'Year *'}
            </label>
            <input
              type="number"
              min={1900}
              max={2030}
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 1980 })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
              required
            />
          </div>

          {formData.date_type === 'DATE_RANGE' && (
            <div>
              <label className="block text-xs font-semibold text-charcoal-dark mb-1">End Year *</label>
              <input
                type="number"
                min={formData.year}
                max={2030}
                value={formData.end_year || formData.year + 5}
                onChange={(e) => setFormData({ ...formData, end_year: parseInt(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
                required
              />
            </div>
          )}

          {formData.date_type === 'EXACT_DATE' && (
            <div>
              <label className="block text-xs font-semibold text-charcoal-dark mb-1">Exact Date</label>
              <input
                type="date"
                value={formData.exact_date || ''}
                onChange={(e) => setFormData({ ...formData, exact_date: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
              />
            </div>
          )}
        </div>
      </div>

      {/* Story Body Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-charcoal-dark">
            Story Body (Min 30 characters) *
          </label>
          <span className="text-xs text-charcoal-muted">
            {formData.story.length} chars
          </span>
        </div>
        <textarea
          rows={6}
          placeholder="Share your story... What memories come back when you think of this location? Who was with you? What did the environment look like back then?"
          value={formData.story}
          onChange={(e) => setFormData({ ...formData, story: e.target.value })}
          className="w-full p-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-body leading-relaxed"
          required
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-5 h-5" />}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-5 h-5" />}
        >
          Continue to Media
        </Button>
      </div>
    </form>
  );
};

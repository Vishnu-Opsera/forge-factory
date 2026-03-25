import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Users, Link2, Check, Plus, X, Eye, EyeOff, Copy } from 'lucide-react';
import { loadSettings, saveSettings } from '../../store/shareStore.js';

export default function SettingsPanel() {
  const [settings, setSettings] = useState(loadSettings());
  const [saved, setSaved] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showPin, setShowPin] = useState(false);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || settings.allowedEmails.includes(email)) return;
    update('allowedEmails', [...settings.allowedEmails, email]);
    setNewEmail('');
  };

  const removeEmail = (email) => {
    update('allowedEmails', settings.allowedEmails.filter(e => e !== email));
  };

  const generatePin = () => {
    update('sharePin', Math.random().toString(36).slice(2, 8).toUpperCase());
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* App Identity */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-forge-purple" />
          <span className="font-semibold text-white text-sm">App Identity</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">App Name</label>
            <input
              type="text"
              value={settings.appName}
              onChange={e => update('appName', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-forge-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Organization Name</label>
            <input
              type="text"
              value={settings.organizationName}
              onChange={e => update('organizationName', e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-forge-purple/50 placeholder-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Share Access Control */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-forge-whisper" />
          <span className="font-semibold text-white text-sm">Share Link Security</span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">Require PIN to view shared links</div>
              <div className="text-xs text-slate-500 mt-0.5">Viewers must enter a PIN before accessing shared ALM views</div>
            </div>
            <button
              onClick={() => update('requirePin', !settings.requirePin)}
              className={`w-10 h-6 rounded-full transition-all relative ${settings.requirePin ? 'bg-forge-purple' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.requirePin ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
          {settings.requirePin && (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Share PIN</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 focus-within:border-forge-purple/50">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={settings.sharePin}
                    onChange={e => update('sharePin', e.target.value)}
                    placeholder="Enter or generate a PIN"
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-600 font-mono"
                  />
                  <button onClick={() => setShowPin(!showPin)} className="text-slate-500 hover:text-white">
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button onClick={generatePin} className="btn-secondary text-xs px-3 py-2">Generate</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Allowed Approvers */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-forge-amber" />
          <span className="font-semibold text-white text-sm">Allowed Approvers</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">Email addresses allowed to review and approve artifacts. Leave empty to allow anyone with the link.</p>
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addEmail()}
            placeholder="approver@company.com"
            className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-forge-amber/50 placeholder-slate-600"
          />
          <button onClick={addEmail} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {settings.allowedEmails.length > 0 ? (
          <div className="space-y-1.5">
            {settings.allowedEmails.map(email => (
              <div key={email} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-forge-amber" />
                  <span className="text-slate-300">{email}</span>
                </div>
                <button onClick={() => removeEmail(email)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-600 text-center py-3">No restrictions — anyone with the link can review</div>
        )}
      </div>

      {/* Save */}
      <button onClick={handleSave} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-sm">
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Settings className="w-4 h-4" /> Save Settings</>}
      </button>
    </div>
  );
}

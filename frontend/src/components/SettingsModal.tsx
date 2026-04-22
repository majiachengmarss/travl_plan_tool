import { useState } from 'react';
import { Settings, X, Save } from 'lucide-react';

export interface AppSettings {
  llmApiKey: string;
  llmModel: string;
  amapWebKey: string;
  amapJsKey: string;
  amapSecurityCode: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  llmApiKey: '',
  llmModel: 'gpt-4o-mini',
  amapWebKey: '', // falls back to server default
  amapJsKey: '', // falls back to HTML default
  amapSecurityCode: ''
};

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    // Migrate old key if exists
    const oldKey = localStorage.getItem('ai_travel_api_key');
    if (oldKey) {
       const migrated = { ...DEFAULT_SETTINGS, llmApiKey: oldKey };
       saveSettings(migrated);
       return migrated;
    }
  } catch (e) {
    console.warn('Failed to parse settings');
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem('app_settings', JSON.stringify(settings));
  // Keep old key in sync for backward compatibility during transition
  localStorage.setItem('ai_travel_api_key', settings.llmApiKey);
}

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setLocalSettings] = useState<AppSettings>(loadSettings());
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = () => {
    saveSettings(settings);
    setSavedMessage('配置已保存！部分高德地图设置可能需要刷新页面生效。');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm slide-up">
      <div className="bg-paper w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white">
          <h3 className="text-xl font-bold text-ink flex items-center gap-2"><Settings size={20}/> 全局环境配置</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cream text-stone hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto hide-scrollbar space-y-6">
            
            {/* LLM Config */}
            <div className="space-y-4">
                <h4 className="font-bold text-stone uppercase tracking-wider text-sm border-b border-border pb-2">🤖 大模型配置 (LLM)</h4>
                
                <div>
                    <label className="block text-xs font-bold text-stone mb-1">默认模型提供商</label>
                    <select 
                       value={settings.llmModel} 
                       onChange={e => setLocalSettings({...settings, llmModel: e.target.value})} 
                       className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white"
                    >
                        <option value="gpt-4o-mini">OpenAI (gpt-4o-mini)</option>
                        <option value="deepseek-chat">DeepSeek (deepseek-chat)</option>
                        <option value="glm-4">智谱清言 (glm-4)</option>
                        <option value="moonshot-v1-8k">Kimi (moonshot-v1-8k)</option>
                        <option value="mimo-v2-pro">小米 MiMo (mimo-v2-pro)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone mb-1">API Key</label>
                    <input 
                       type="password" 
                       value={settings.llmApiKey} 
                       onChange={e => setLocalSettings({...settings, llmApiKey: e.target.value})} 
                       placeholder="sk-..." 
                       className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono" 
                    />
                </div>
            </div>

            {/* AMap Config */}
            <div className="space-y-4">
                <h4 className="font-bold text-stone uppercase tracking-wider text-sm border-b border-border pb-2">🗺️ 高德地图配置 (AMap)</h4>
                <p className="text-xs text-stone leading-relaxed">
                   如果您不填写，系统将使用默认体验 Key（仅供测试，有并发限制）。
                   如需稳定使用，请前往高德开放平台申请。
                </p>

                <div>
                    <label className="block text-xs font-bold text-stone mb-1">Web 服务 API Key (后端线路规划使用)</label>
                    <input 
                       type="text" 
                       value={settings.amapWebKey} 
                       onChange={e => setLocalSettings({...settings, amapWebKey: e.target.value})} 
                       placeholder="留空则使用内置默认 Key" 
                       className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono" 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone mb-1">Web 端 (JS API) Key (前端地图渲染使用)</label>
                    <input 
                       type="text" 
                       value={settings.amapJsKey} 
                       onChange={e => setLocalSettings({...settings, amapJsKey: e.target.value})} 
                       placeholder="留空则使用内置默认 Key" 
                       className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono" 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone mb-1">Web 端 JS 安全密钥 (Security Code)</label>
                    <input 
                       type="text" 
                       value={settings.amapSecurityCode} 
                       onChange={e => setLocalSettings({...settings, amapSecurityCode: e.target.value})} 
                       placeholder="留空则使用内置默认密钥" 
                       className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono" 
                    />
                </div>
            </div>

        </div>

        <div className="px-6 py-4 border-t border-border bg-cream flex items-center justify-between">
           <span className="text-xs font-bold text-teal-600">{savedMessage}</span>
           <button onClick={handleSave} className="px-6 py-2 bg-ink hover:bg-black text-white font-bold rounded-xl flex items-center gap-2 transition">
              保存配置 <Save size={16} />
           </button>
        </div>

      </div>
    </div>
  );
}
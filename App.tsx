
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Layout, Save, Trash2, Eye, ArrowLeft, FileCode, Wand2, Share2, Globe, Check, AlertTriangle } from 'lucide-react';
import { Template, VariableMapping } from './types';
import { analyzeHtmlForVariables } from './services/geminiService';

// --- Utils ---
const encodeTemplate = (tpl: Template): string => {
  try {
    const str = JSON.stringify(tpl);
    return btoa(encodeURIComponent(str));
  } catch (e) {
    console.error("Encoding failed", e);
    return "";
  }
};

const decodeTemplate = (blob: string): Template | null => {
  if (!blob) return null;
  try {
    const str = decodeURIComponent(atob(blob));
    return JSON.parse(str);
  } catch (e) {
    console.error("Failed to decode template", e);
    return null;
  }
};

// --- Components ---

const Header = () => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600 hover:opacity-80 transition-opacity">
        <Layout className="w-6 h-6" />
        <span>HTML Transformer</span>
      </Link>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
          Production
        </div>
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>
    </div>
  </header>
);

const Dashboard = ({ templates, onDelete }: { templates: Template[], onDelete: (id: string) => void }) => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (tpl: Template) => {
    const blob = encodeTemplate(tpl);
    const url = `${window.location.origin}${window.location.pathname}#/s/${blob}`;
    navigator.clipboard.writeText(url);
    setCopiedId(tpl.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Ваши проекты</h1>
          <p className="text-slate-500 mt-1">Управляйте страницами и создавайте вечные ссылки</p>
        </div>
        <button 
          onClick={() => navigate('/editor')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Новый проект
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileCode className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Нет проектов</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">Загрузите SingleFile HTML, чтобы начать.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(tpl => (
            <div key={tpl.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleCopyLink(tpl)}
                      className={`p-2 rounded-lg transition-colors ${copiedId === tpl.id ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                      title="Публичная ссылка"
                    >
                      {copiedId === tpl.id ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => onDelete(tpl.id)}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1 truncate">{tpl.name}</h3>
                <p className="text-xs text-slate-400 mb-6 uppercase tracking-tighter">ID: {tpl.id}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => navigate(`/view/${tpl.id}`)} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-all">Смотреть</button>
                  <button onClick={() => navigate(`/editor/${tpl.id}`)} className="bg-white border border-slate-200 hover:border-blue-300 text-slate-700 px-3 py-2.5 rounded-xl text-sm font-bold transition-all">Изменить</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Editor = ({ onSave, initialTemplate }: { onSave: (tpl: Template) => void, initialTemplate?: Template }) => {
  const navigate = useNavigate();
  const [name, setName] = useState(initialTemplate?.name || '');
  const [html, setHtml] = useState(initialTemplate?.originalHtml || '');
  const [mappings, setMappings] = useState<VariableMapping[]>(initialTemplate?.mappings || []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Внимание: Файл очень большой (>5МБ). Он может не сохраниться в браузере, используйте кнопку 'Поделиться' для генерации прямой ссылки.");
      } else {
        setError(null);
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setHtml(content);
        if (!name) setName(file.name.replace('.html', ''));
      };
      reader.readAsText(file);
    }
  };

  const handleAiAnalyze = async () => {
    if (!html) return;
    setIsAnalyzing(true);
    try {
      const suggestions = await analyzeHtmlForVariables(html);
      const newMappings: VariableMapping[] = suggestions.map((s: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        originalText: s.originalText,
        replacementText: s.originalText,
        label: s.label
      }));
      setMappings(newMappings);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addMapping = () => {
    setMappings([...mappings, { id: Math.random().toString(36).substr(2, 9), originalText: '', replacementText: '', label: 'Новое поле' }]);
  };

  const updateMapping = (id: string, field: keyof VariableMapping, value: string) => {
    setMappings(mappings.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const handleSave = () => {
    if (!name || !html) return;
    onSave({
      id: initialTemplate?.id || Math.random().toString(36).substr(2, 9),
      name,
      originalHtml: html,
      mappings,
      updatedAt: Date.now()
    });
    navigate('/');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{initialTemplate ? 'Настройка страницы' : 'Новая страница'}</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold mb-6">1. Загрузка HTML</h2>
            <div className="space-y-4">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Название (например, Лендинг Казино)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50 relative group hover:border-blue-400 transition-all">
                <input type="file" accept=".html" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="flex flex-col items-center">
                  <FileCode className="w-10 h-10 text-slate-300 mb-2 group-hover:text-blue-400 transition-colors" />
                  <p className="text-slate-500 font-medium">{html ? 'Файл готов (кликните для замены)' : 'Перетащите сюда SingleFile HTML'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">2. Что заменить?</h2>
              <div className="flex gap-2">
                <button onClick={handleAiAnalyze} disabled={!html || isAnalyzing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-purple-700 transition-all flex items-center gap-2">
                  <Wand2 className="w-4 h-4" /> {isAnalyzing ? 'Поиск...' : 'ИИ Поиск'}
                </button>
                <button onClick={addMapping} className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200">Добавить вручную</button>
              </div>
            </div>
            <div className="space-y-4">
              {mappings.length === 0 && <p className="text-center py-10 text-slate-400 text-sm italic">Список замен пуст. Используйте ИИ или добавьте поле вручную.</p>}
              {mappings.map(m => (
                <div key={m.id} className="p-5 border border-slate-200 rounded-2xl space-y-3 relative group hover:border-blue-200 transition-all shadow-sm">
                  <button onClick={() => removeMapping(m.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  <input type="text" value={m.label} onChange={e => updateMapping(m.id, 'label', e.target.value)} className="w-full border-b border-slate-100 text-sm font-bold outline-none py-1 focus:border-blue-400" placeholder="Метка (например, Ссылка на кнопку)" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 ml-1">Искать текст</span>
                      <input type="text" value={m.originalText} onChange={e => updateMapping(m.id, 'originalText', e.target.value)} placeholder="Текст как в HTML" className="w-full bg-slate-50 p-2 rounded-lg text-xs outline-none focus:bg-white border border-transparent focus:border-slate-200" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-blue-400 ml-1">Новый текст</span>
                      <input type="text" value={m.replacementText} onChange={e => updateMapping(m.id, 'replacementText', e.target.value)} placeholder="На что заменить" className="w-full bg-blue-50 p-2 rounded-lg text-xs outline-none focus:bg-white border border-transparent focus:border-blue-200 font-bold text-blue-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">
            <button onClick={handleSave} disabled={!name || !html} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
              Сохранить проект
            </button>
            <div className="p-4 bg-slate-100 rounded-2xl text-[11px] text-slate-500 leading-relaxed">
              <strong>Совет:</strong> Если вы меняете ссылки, убедитесь, что в поле "Искать текст" указан точный URL из исходного кода страницы.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Previewer = ({ template, isPublic = false }: { template?: Template | null, isPublic?: boolean }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const transformedHtml = useMemo(() => {
    if (!template) return '';
    let res = template.originalHtml;
    template.mappings.forEach(m => {
      if (m.originalText) {
        const escaped = m.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        res = res.replace(new RegExp(escaped, 'g'), m.replacementText);
      }
    });
    return res;
  }, [template]);

  if (!template) return (
    <div className="h-screen flex items-center justify-center flex-col bg-slate-50 p-10">
      <div className="p-10 bg-white border border-slate-200 rounded-3xl shadow-xl text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Проект не найден</h2>
        <p className="text-slate-500 mb-6 text-sm">Возможно, вы очистили данные браузера или перешли по неверной ссылке.</p>
        <Link to="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">На главную</Link>
      </div>
    </div>
  );

  const handleShare = () => {
    const blob = encodeTemplate(template);
    const url = `${window.location.origin}${window.location.pathname}#/s/${blob}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          {!isPublic && <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>}
          <span className="text-sm font-bold text-slate-900">{template.name}</span>
        </div>
        <div className="flex gap-2">
          {!isPublic && (
            <button onClick={handleShare} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              {copied ? 'Скопировано!' : 'Вечная ссылка'}
            </button>
          )}
        </div>
      </div>
      <iframe srcDoc={transformedHtml} title="preview" className="flex-1 w-full bg-white border-none" sandbox="allow-scripts allow-forms allow-same-origin" />
    </div>
  );
};

// --- Route Wrappers to fix useParams bug ---

const EditRoute = ({ templates, onSave }: { templates: Template[], onSave: (tpl: Template) => void }) => {
  const { id } = useParams();
  const template = templates.find(t => t.id === id);
  return <Editor onSave={onSave} initialTemplate={template} />;
};

const ViewRoute = ({ templates }: { templates: Template[] }) => {
  const { id } = useParams();
  const template = templates.find(t => t.id === id);
  return <Previewer template={template} />;
};

const PublicViewer = () => {
  const { blob } = useParams();
  const template = useMemo(() => (blob ? decodeTemplate(blob) : null), [blob]);
  return <Previewer template={template} isPublic={true} />;
};

function AppContent() {
  const [templates, setTemplates] = useState<Template[]>(() => {
    try {
      const saved = localStorage.getItem('html_transformer_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('html_transformer_templates', JSON.stringify(templates));
    } catch (e) {
      console.warn("LocalStorage quota exceeded, but the state remains in memory.");
    }
  }, [templates]);

  const saveTemplate = (tpl: Template) => {
    setTemplates(prev => {
      const exists = prev.find(p => p.id === tpl.id);
      return exists ? prev.map(p => p.id === tpl.id ? tpl : p) : [tpl, ...prev];
    });
  };

  const deleteTemplate = (id: string) => {
    if (confirm('Удалить проект из памяти браузера?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <Routes>
        <Route path="/" element={<><Header /><Dashboard templates={templates} onDelete={deleteTemplate} /></>} />
        <Route path="/editor" element={<><Header /><Editor onSave={saveTemplate} /></>} />
        <Route path="/editor/:id" element={<><Header /><EditRoute templates={templates} onSave={saveTemplate} /></>} />
        <Route path="/view/:id" element={<ViewRoute templates={templates} />} />
        <Route path="/s/:blob" element={<PublicViewer />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;

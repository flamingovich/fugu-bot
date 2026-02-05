
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Layout, Save, Trash2, Eye, ArrowLeft, FileCode, Wand2, Share2, Copy, Globe, Check, ExternalLink } from 'lucide-react';
import { Template, VariableMapping } from './types';
import { analyzeHtmlForVariables } from './services/geminiService';

// --- Utils ---
const encodeTemplate = (tpl: Template): string => {
  const str = JSON.stringify(tpl);
  return btoa(encodeURIComponent(str));
};

const decodeTemplate = (blob: string): Template | null => {
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
          Production Mode
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
          <p className="text-slate-500 mt-1">Управляйте и публикуйте ваши динамические страницы</p>
        </div>
        <button 
          onClick={() => navigate('/editor')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200 font-semibold"
        >
          <Plus className="w-5 h-5" />
          Создать страницу
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileCode className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Нет активных страниц</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">Загрузите HTML-файл, чтобы создать ссылку, которая будет работать вечно.</p>
          <button 
            onClick={() => navigate('/editor')}
            className="mt-6 text-blue-600 font-semibold hover:underline"
          >
            Начать прямо сейчас &rarr;
          </button>
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
                      title="Скопировать публичную ссылку"
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
                <p className="text-xs text-slate-400 mb-6 flex items-center gap-1">
                  Обновлено {new Date(tpl.updatedAt).toLocaleDateString()}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => navigate(`/view/${tpl.id}`)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    Предпросмотр
                  </button>
                  <button 
                    onClick={() => navigate(`/editor/${tpl.id}`)}
                    className="bg-white border border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-700 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
                  >
                    Изменить
                  </button>
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    const suggestions = await analyzeHtmlForVariables(html);
    const newMappings: VariableMapping[] = suggestions.map((s: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      originalText: s.originalText,
      replacementText: s.originalText,
      label: s.label
    }));
    setMappings(newMappings);
    setIsAnalyzing(false);
  };

  const addMapping = () => {
    const newMapping: VariableMapping = {
      id: Math.random().toString(36).substr(2, 9),
      originalText: '',
      replacementText: '',
      label: 'Новое поле'
    };
    setMappings([...mappings, newMapping]);
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
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{initialTemplate ? 'Редактирование' : 'Новая страница'}</h1>
            <p className="text-slate-500 text-sm">Настройте динамические поля вашего HTML</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-blue-500" />
              Исходный HTML
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Название проекта</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  placeholder="Напр. Мой лендинг"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Загрузить файл</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".html"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center group-hover:border-blue-400 transition-colors bg-slate-50">
                    <Plus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">{html ? 'Файл выбран (нажмите, чтобы изменить)' : 'Выберите или перетащите .html файл'}</p>
                    {html && <p className="text-[10px] text-green-600 mt-1 font-bold">Готов к трансформации</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-500" />
                Динамические поля
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleAiAnalyze}
                  disabled={!html || isAnalyzing}
                  className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-50 shadow-lg shadow-purple-100"
                >
                  <Wand2 className="w-4 h-4" />
                  {isAnalyzing ? 'Ищем...' : 'ИИ Поиск'}
                </button>
                <button 
                  onClick={addMapping}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {mappings.length === 0 ? (
                <div className="text-center py-12 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <p className="text-slate-400 text-sm">Нажмите "ИИ Поиск", чтобы автоматически найти тексты для замены</p>
                </div>
              ) : (
                mappings.map(m => (
                  <div key={m.id} className="p-5 border border-slate-200 bg-white rounded-2xl space-y-4 relative group hover:border-blue-200 transition-colors shadow-sm">
                    <button 
                      onClick={() => removeMapping(m.id)}
                      className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-2/3">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Метка</label>
                      <input 
                        type="text" 
                        value={m.label}
                        onChange={(e) => updateMapping(m.id, 'label', e.target.value)}
                        className="w-full border-b border-slate-100 text-sm font-bold outline-none focus:border-blue-500 py-1"
                        placeholder="Название поля"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest text-center">Искать текст</label>
                        <input 
                          type="text" 
                          value={m.originalText}
                          onChange={(e) => updateMapping(m.id, 'originalText', e.target.value)}
                          className="w-full bg-transparent text-xs outline-none text-slate-600 font-mono text-center"
                          placeholder="Точный текст из HTML"
                        />
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1 tracking-widest text-center">Заменить на</label>
                        <input 
                          type="text" 
                          value={m.replacementText}
                          onChange={(e) => updateMapping(m.id, 'replacementText', e.target.value)}
                          className="w-full bg-transparent text-xs outline-none text-blue-700 font-bold text-center"
                          placeholder="Новое значение"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl sticky top-24">
            <h3 className="font-bold text-xl mb-6 text-slate-900">Публикация</h3>
            <div className="space-y-4">
              <button 
                onClick={handleSave}
                disabled={!name || !html}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 text-lg"
              >
                <Save className="w-5 h-5" />
                Сохранить проект
              </button>
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                <p className="text-xs text-yellow-700 leading-relaxed font-medium">
                  <strong>Важно:</strong> После сохранения на главном экране появится кнопка "Поделиться". Она создаст вечную ссылку на вашу страницу.
                </p>
              </div>
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
    return template.mappings.reduce((acc, curr) => {
      if (!curr.originalText) return acc;
      const escapedText = curr.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedText, 'g');
      return acc.replace(regex, curr.replacementText);
    }, template.originalHtml);
  }, [template]);

  if (!template) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 flex-col p-6 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 max-w-md">
        <h2 className="font-bold text-xl mb-2">Ошибка доступа</h2>
        <p>Ссылка недействительна или данные повреждены.</p>
      </div>
      <Link to="/" className="text-blue-600 font-bold hover:underline">Вернуться на главную</Link>
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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
      <div className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          {!isPublic && (
            <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 leading-none">{template.name}</span>
            <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-0.5">Live View</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {!isPublic && (
             <button 
                onClick={handleShare}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copied ? 'Ссылка скопирована' : 'Публичная ссылка'}
              </button>
           )}
           <button 
            onClick={() => {
                const blob = new Blob([transformedHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${template.name}.html`;
                a.click();
            }}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all"
           >
             <Copy className="w-3 h-3" /> Сохранить HTML
           </button>
        </div>
      </div>
      <div className="relative flex-1 bg-slate-200">
        <iframe 
          srcDoc={transformedHtml} 
          title="preview" 
          className="w-full h-full bg-white shadow-2xl"
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      </div>
    </div>
  );
};

const PublicViewer = () => {
  const { blob } = useParams();
  const template = useMemo(() => (blob ? decodeTemplate(blob) : null), [blob]);
  return <Previewer template={template} isPublic={true} />;
};

// --- Main App Logic ---

function AppContent() {
  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem('html_transformer_templates');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('html_transformer_templates', JSON.stringify(templates));
  }, [templates]);

  const saveTemplate = (tpl: Template) => {
    setTemplates(prev => {
      const exists = prev.find(p => p.id === tpl.id);
      if (exists) return prev.map(p => p.id === tpl.id ? tpl : p);
      return [tpl, ...prev];
    });
  };

  const deleteTemplate = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот проект? Локальная копия будет удалена, но созданные ранее публичные ссылки продолжат работать у тех, кому вы их дали.')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const EditWrapper = () => {
    const { id } = useParams();
    const template = templates.find(t => t.id === id);
    return <Editor onSave={saveTemplate} initialTemplate={template} />;
  };

  const ViewWrapper = () => {
    const { id } = useParams();
    const template = templates.find(t => t.id === id);
    return <Previewer template={template} />;
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900">
      <Routes>
        <Route path="/" element={<><Header /><Dashboard templates={templates} onDelete={deleteTemplate} /></>} />
        <Route path="/editor" element={<><Header /><Editor onSave={saveTemplate} /></>} />
        <Route path="/editor/:id" element={<><Header /><EditWrapper /></>} />
        <Route path="/view/:id" element={<ViewWrapper />} />
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

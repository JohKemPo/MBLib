import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { 
  FolderOpen, 
  Folder, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Search,
  BookOpen,
  AlertCircle,
  X
} from 'lucide-react';

// --- Helper Functions ---

// Lê o conteúdo de um arquivo
const readFileContent = async (fileHandle) => {
  const file = await fileHandle.getFile();
  const text = await file.text();
  return text;
};

// --- Components ---

// Reusable Button inspired by the design system
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick, 
  className = '',
  icon: Icon
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 shadow-sm",
    ghost: "text-blue-600 hover:bg-blue-50 focus:ring-blue-500 bg-transparent",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
  };

  const disabledStyle = "opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyle} 
        ${sizeStyles[size]} 
        ${variantStyles[variant]} 
        ${disabled ? disabledStyle : ''} 
        ${className}
      `}
    >
      {Icon && <Icon className={`mr-2 ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`} />}
      {children}
    </button>
  );
};

// Input field inspired by the design system
const Input = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  icon: Icon,
  error,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            block w-full rounded-md border-gray-300 shadow-sm sm:text-sm
            focus:ring-blue-500 focus:border-blue-500
            ${Icon ? 'pl-10' : 'pl-3'}
            ${error ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
            py-2
          `}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

// Chip component inspired by the design system
const Chip = ({ children, active, onClick, onClose }) => {
  return (
    <span 
      onClick={onClick}
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors
        ${active 
          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
          : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
        }
      `}
    >
      {children}
      {onClose && (
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`ml-1.5 inline-flex focus:outline-none 
            ${active ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-gray-500'}`
          }
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

const TreeNode = ({ node, level = 0, onSelectFile, selectedFileId }) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Open root level by default
  const isSelected = node.id === selectedFileId;
  const isDirectory = node.kind === 'directory';

  const toggleOpen = () => {
    if (isDirectory) setIsOpen(!isOpen);
  };

  const handleSelect = () => {
    if (isDirectory) {
      toggleOpen();
    } else {
      onSelectFile(node);
    }
  };

  const paddingLeft = `${level * 1.2 + 0.5}rem`;

  return (
    <div>
      <div
        className={`
          flex items-center py-1.5 pr-2 cursor-pointer transition-colors group
          ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
        `}
        style={{ paddingLeft }}
        onClick={handleSelect}
        title={node.name}
      >
        <span className="mr-1.5 flex-shrink-0 text-gray-400 group-hover:text-gray-600">
          {isDirectory ? (
            isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            <span className="w-4 h-4 inline-block" /> // Placeholder to align files with folders
          )}
        </span>
        
        <span className={`mr-2 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
          {isDirectory ? (
             <Folder className="w-4 h-4 fill-current opacity-20" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </span>
        
        <span className="text-sm truncate select-none font-medium">
          {node.name.replace(/\.md$/, '')}
        </span>
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelectFile={onSelectFile}
              selectedFileId={selectedFileId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function MarkdownLibrary() {
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  // Check if File System Access API is supported
  useEffect(() => {
    if (!('showDirectoryPicker' in window)) {
      setIsSupported(false);
      setError('A API File System Access não é suportada pelo seu navegador. Tente usar o Chrome, Edge ou Opera em um desktop.');
    }
  }, []);

  // Recursively read directory structure
  const buildFileTree = useCallback(async (dirHandle, path = '') => {
    const nodes = [];
    for await (const entry of dirHandle.values()) {
      const currentPath = `${path}/${entry.name}`;
      const id = currentPath;

      if (entry.kind === 'file') {
        // Only include .md files
        if (entry.name.toLowerCase().endsWith('.md')) {
          nodes.push({
            id,
            name: entry.name,
            kind: 'file',
            handle: entry,
            path: currentPath
          });
        }
      } else if (entry.kind === 'directory') {
        // Ignore hidden folders like .git
        if (!entry.name.startsWith('.')) {
          const children = await buildFileTree(entry, currentPath);
          // Only add directory if it contains markdown files or subdirectories with markdown files
          if (children.length > 0) {
            nodes.push({
              id,
              name: entry.name,
              kind: 'directory',
              handle: entry,
              path: currentPath,
              children: children.sort((a, b) => {
                // Sort directories first, then files
                if (a.kind === b.kind) return a.name.localeCompare(b.name);
                return a.kind === 'directory' ? -1 : 1;
              })
            });
          }
        }
      }
    }
    return nodes;
  }, []);

  const handleSelectDirectory = async () => {
    try {
      setError('');
      setIsLoading(true);
      const handle = await window.showDirectoryPicker({
        mode: 'read'
      });
      setDirectoryHandle(handle);
      
      const tree = await buildFileTree(handle);
      
      // Sort root level
      tree.sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === 'directory' ? -1 : 1;
      });

      setFileTree([{
         id: 'root',
         name: handle.name,
         kind: 'directory',
         handle: handle,
         path: '',
         children: tree
      }]);
      
      setSelectedFile(null);
      setFileContent('');
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setError(`Erro ao acessar diretório: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = async (node) => {
    if (node.kind !== 'file') return;
    
    try {
      setIsLoading(true);
      setSelectedFile(node);
      const text = await readFileContent(node.handle);
      setFileContent(text);
    } catch (err) {
      console.error(err);
      setError(`Erro ao ler arquivo: ${err.message}`);
      setFileContent('');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tree based on search query
  const filterTree = (nodes, query) => {
    if (!query) return nodes;
    
    const lowerQuery = query.toLowerCase();
    
    return nodes.map(node => {
      if (node.kind === 'file') {
        if (node.name.toLowerCase().includes(lowerQuery)) return node;
        return null;
      }
      
      if (node.kind === 'directory') {
        const filteredChildren = filterTree(node.children, query).filter(Boolean);
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lowerQuery)) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }
      return null;
    }).filter(Boolean);
  };

  const filteredTree = useMemo(() => filterTree(fileTree, searchQuery), [fileTree, searchQuery]);

  // Configure marked options for better output (github flavored markdown, etc)
  marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: true,
  });

  const getRenderedMarkdown = () => {
    if (!fileContent) return { __html: '' };
    const rawMarkup = marked(fileContent);
    const cleanMarkup = DOMPurify.sanitize(rawMarkup);
    return { __html: cleanMarkup };
  };

  const handleMarkdownClick = (e) => {
    // Verifica se o clique foi em um link ou dentro de um link
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    
    // Ignorar links externos ou links de email (abre em nova aba)
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    // Links de âncora na mesma página (ex: #titulo)
    const pathOnly = href.split('#')[0];
    if (!pathOnly) return; 

    // Prevenir o comportamento padrão (recarregamento da página)
    e.preventDefault();

    try {
      const decodedPath = decodeURIComponent(pathOnly);
      let targetPath = '';

      if (decodedPath.startsWith('/')) {
        // Caminho absoluto (a partir da raiz da pasta selecionada)
        const absoluteParts = decodedPath.split('/').filter(Boolean);
        targetPath = '/' + absoluteParts.join('/');
      } else {
        // Caminho relativo (a partir do arquivo atual)
        const currentParts = selectedFile.path.split('/').filter(Boolean);
        currentParts.pop(); // Remove o nome do arquivo atual para ficar apenas com o diretório

        const relativeParts = decodedPath.split('/').filter(Boolean);
        for (const part of relativeParts) {
          if (part === '.') continue; // "." significa pasta atual
          if (part === '..') {
            currentParts.pop(); // ".." sobe um nível
          } else {
            currentParts.push(part);
          }
        }
        targetPath = '/' + currentParts.join('/');
      }

      // Função para buscar o arquivo na árvore de pastas
      const findNodeByPath = (nodes, pathToFind) => {
        for (const node of nodes) {
          if (node.path === pathToFind) return node;
          if (node.children) {
            const found = findNodeByPath(node.children, pathToFind);
            if (found) return found;
          }
        }
        return null;
      };

      let targetNode = findNodeByPath(fileTree, targetPath);

      // Se não encontrou, tenta adicionar a extensão '.md' caso o link tenha omitido
      if (!targetNode && !targetPath.toLowerCase().endsWith('.md')) {
        targetNode = findNodeByPath(fileTree, targetPath + '.md');
      }

      if (targetNode && targetNode.kind === 'file') {
        handleSelectFile(targetNode); // Abre o arquivo referenciado
      } else {
        console.warn("Arquivo não encontrado:", targetPath);
        setError(`Arquivo referenciado não encontrado na biblioteca: ${decodedPath}`);
        // Limpar o aviso de erro após 4 segundos
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      console.error("Erro ao resolver link:", err);
    }
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Navegador Não Suportado</h1>
        <p className="text-gray-600 max-w-md">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      
      {/* Sidebar / Navigation */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-gray-50/50 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <BookOpen className="w-6 h-6" />
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">MD Library</h1>
          </div>
          
          <Button 
            onClick={handleSelectDirectory} 
            variant="primary" 
            className="w-full justify-center mb-4"
            icon={FolderOpen}
          >
            {directoryHandle ? 'Mudar Diretório' : 'Abrir Pasta de Projetos'}
          </Button>

          {directoryHandle && (
            <Input
              placeholder="Buscar arquivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
          )}
        </div>

        {/* File Tree Area */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300">
          {isLoading && !selectedFile && (
             <div className="flex justify-center p-4">
               <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
             </div>
          )}
          
          {!directoryHandle && !isLoading && (
            <div className="text-center p-6 mt-10">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Selecione uma pasta para visualizar seus arquivos Markdown.
              </p>
            </div>
          )}

          {directoryHandle && filteredTree.length === 0 && (
            <p className="text-sm text-gray-500 text-center p-4">
              Nenhum arquivo .md encontrado.
            </p>
          )}

          {filteredTree.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              onSelectFile={handleSelectFile}
              selectedFileId={selectedFile?.id}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        {/* Top bar for context */}
        {selectedFile && (
           <div className="h-14 border-b border-gray-200 flex items-center px-6 bg-white sticky top-0 z-10">
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium text-gray-700">{selectedFile.name}</span>
                <span className="mx-2 text-gray-300">/</span>
                <span className="truncate max-w-md" title={selectedFile.path}>{selectedFile.path}</span>
              </div>
           </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 md:p-12 lg:px-24 xl:px-32">
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {isLoading && selectedFile && (
             <div className="flex items-center justify-center h-64">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          )}

          {!selectedFile && !isLoading && directoryHandle && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <FileText className="w-20 h-20 mb-4 opacity-20" />
              <p className="text-lg">Selecione um arquivo para leitura</p>
            </div>
          )}

          {/* Markdown Render Area - Styled to resemble typical markdown presentation (like GitHub or Notion) */}
          {selectedFile && !isLoading && (
            <article 
              onClick={handleMarkdownClick}
              className="prose prose-slate prose-blue max-w-4xl mx-auto"
              dangerouslySetInnerHTML={getRenderedMarkdown()}
            />
          )}
        </div>
      </div>
      
      {/* 
        Tailwind Prose styles injected globally for the markdown content 
        Since we are using basic Tailwind in this environment without @tailwindcss/typography plugin configured in tailwind.config.js,
        we need to provide some base styles for the markdown elements to look good.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        .prose h1 { font-size: 2.25em; margin-top: 0; margin-bottom: 0.8888889em; line-height: 1.1111111; font-weight: 800; color: #111827; }
        .prose h2 { font-size: 1.5em; margin-top: 2em; margin-bottom: 1em; line-height: 1.3333333; font-weight: 700; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
        .prose h3 { font-size: 1.25em; margin-top: 1.6em; margin-bottom: 0.6em; line-height: 1.6; font-weight: 600; color: #111827; }
        .prose p { margin-top: 1.25em; margin-bottom: 1.25em; color: #374151; line-height: 1.75; }
        .prose a { color: #2563eb; text-decoration: none; font-weight: 500; }
        .prose a:hover { text-decoration: underline; }
        .prose strong { font-weight: 600; color: #111827; }
        .prose ul { margin-top: 1.25em; margin-bottom: 1.25em; padding-left: 1.625em; list-style-type: disc; color: #374151; }
        .prose ol { margin-top: 1.25em; margin-bottom: 1.25em; padding-left: 1.625em; list-style-type: decimal; color: #374151; }
        .prose li { margin-top: 0.5em; margin-bottom: 0.5em; }
        .prose blockquote { font-weight: 500; font-style: italic; color: #111827; border-left-width: 0.25rem; border-left-color: #e5e7eb; quotes: "\\201C""\\201D""\\2018""\\2019"; margin-top: 1.6em; margin-bottom: 1.6em; padding-left: 1em; }
        .prose code { color: #111827; font-weight: 600; font-size: 0.875em; padding: 0.2em 0.4em; background-color: #f3f4f6; border-radius: 0.25rem; }
        .prose pre { color: #e5e7eb; background-color: #1f2937; overflow-x: auto; font-size: 0.875em; line-height: 1.7142857; margin-top: 1.7142857em; margin-bottom: 1.7142857em; border-radius: 0.375rem; padding: 1.1428571em; }
        .prose pre code { background-color: transparent; border-width: 0; border-radius: 0; padding: 0; font-weight: 400; color: inherit; font-size: inherit; font-family: inherit; line-height: inherit; }
        .prose img { max-width: 100%; height: auto; margin-top: 2em; margin-bottom: 2em; border-radius: 0.375rem; }
        .prose hr { border-color: #e5e7eb; border-top-width: 1px; margin-top: 3em; margin-bottom: 3em; }
        .prose table { width: 100%; table-layout: auto; text-align: left; margin-top: 2em; margin-bottom: 2em; font-size: 0.875em; line-height: 1.7142857; border-collapse: collapse;}
        .prose thead { color: #111827; font-weight: 600; border-bottom-width: 1px; border-bottom-color: #d1d5db; }
        .prose th, .prose td { padding: 0.5714286em; border: 1px solid #e5e7eb;}
      `}} />
    </div>
  );
}
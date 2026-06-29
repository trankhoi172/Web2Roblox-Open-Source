const Editor = {
    textarea: null,
    highlightLayer: null,
    lineNumbers: null,
    
    init: function() {
        this.textarea = document.getElementById('htmlInput');
        this.highlightLayer = document.getElementById('highlightLayer');
        this.lineNumbers = document.getElementById('lineNumbers');
        
        this.setupEventListeners();
        this.setupDragDrop();
        this.setupFileLoad();
        this.setupUrlLoad();
        this.setupExamples();
        this.setupFormatBtn();
        this.setupClearBtn();
        
        this.updateHighlight();
        this.updateLineNumbers();
    },

    setupEventListeners: function() {
        this.textarea.addEventListener('input', () => {
            this.updateHighlight();
            this.updateLineNumbers();
            this.updateStatus('Ready', 'ready');
        });

        // Sync scroll between textarea, highlight layer, and line numbers
        this.textarea.addEventListener('scroll', () => {
            this.highlightLayer.scrollTop = this.textarea.scrollTop;
            this.highlightLayer.scrollLeft = this.textarea.scrollLeft;
            this.lineNumbers.scrollTop = this.textarea.scrollTop;
        });

        // Handle Tab key for indentation
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.textarea.selectionStart;
                const end = this.textarea.selectionEnd;
                this.textarea.value = this.textarea.value.substring(0, start) + '    ' + this.textarea.value.substring(end);
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
                this.updateHighlight();
            }
        });
    },

    setupDragDrop: function() {
        const wrapper = document.querySelector('.editor-wrapper');
        
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.classList.add('drag-over');
        });

        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('drag-over');
        });

        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.loadFile(e.dataTransfer.files[0]);
            }
        });
    },

    setupFileLoad: function() {
        const btn = document.getElementById('btnLoadFile');
        const input = document.getElementById('fileInput');
        
        // Clone to remove any duplicate event listeners attached previously
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => input.click());
        
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadFile(e.target.files[0]);
                input.value = ''; // Reset input so the same file can be selected again
            }
        });
    },

    setupUrlLoad: function() {
        const btn = document.getElementById('btnLoadUrl');
        const input = document.getElementById('urlInput');
        
        btn.addEventListener('click', () => {
            const url = input.value.trim();
            if (url) this.loadUrl(url);
        });
    },

    setupExamples: function() {
        document.querySelectorAll('.example-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadExample(item.dataset.example);
            });
        });
    },

    setupFormatBtn: function() {
        document.getElementById('btnFormat').addEventListener('click', () => {
            const formatted = Utils.formatHTML(this.textarea.value);
            this.setContent(formatted);
            this.updateStatus('Formatted', 'ready');
        });
    },

        // ADD THIS METHOD
    setupClearBtn: function() {
        document.getElementById('btnClear').addEventListener('click', () => {
            // Prevent unnecessary processing if already empty
            if (this.textarea.value.trim() === '') return;
            
            this.setContent('');
            this.updateStatus('Editor cleared', 'ready');
        });
    },

    setContent: function(content) {
        this.textarea.value = content;
        this.updateHighlight();
        this.updateLineNumbers();
    },

    loadFile: function(file) {
        const validExts = ['.html', '.htm', '.css', '.txt'];
        if (!validExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
            this.updateStatus('Error: Please select an HTML/CSS file', 'error');
            return;
        }
        
        this.updateStatus(`Loading ${file.name}...`, 'processing');
        const reader = new FileReader();
        reader.onload = (e) => {
            this.setContent(Utils.formatHTML(e.target.result));
            this.updateStatus(`Loaded ${file.name}`, 'ready');
        };
        reader.onerror = () => this.updateStatus('Error reading file', 'error');
        reader.readAsText(file);
    },

    loadUrl: function(url) {
        this.updateStatus('Fetching URL...', 'processing');
        // Using a public CORS proxy to allow client-side fetching of external sites
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        
        fetch(proxyUrl)
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.text();
            })
            .then(data => {
                this.setContent(Utils.formatHTML(data));
                this.updateStatus('URL loaded successfully', 'ready');
            })
            .catch(() => this.updateStatus('Error fetching URL (CORS/Network)', 'error'));
    },

    loadExample: function(key) {
        if (EXAMPLES[key]) {
            this.setContent(EXAMPLES[key].trim());
            this.updateStatus(`Loaded example: ${key}`, 'ready');
            document.querySelector('.tab[data-tab="paste"]').click();
        }
    },

    updateLineNumbers: function() {
        const lines = this.textarea.value.split('\n').length;
        let nums = '';
        for (let i = 1; i <= lines; i++) nums += i + '\n';
        this.lineNumbers.textContent = nums;
    },

    updateHighlight: function() {
        let text = this.textarea.value;
        let html = Utils.escapeHTML(text);
        
        // Visual syntax highlighting (Regex used ONLY for visual tokens, not logical parsing)
        html = html.replace(/(&lt;\/?)([a-zA-Z0-9]+)/g, '$1<span class="token tag">$2</span>');
        html = html.replace(/([a-zA-Z-]+)(=)(&quot;[^&]*&quot;)/g, '<span class="token attr">$1</span>$2<span class="token string">$3</span>');
        html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token comment">$1</span>');
        html = html.replace(/([a-z-]+)(\s*:\s*)/g, '<span class="token css-prop">$1</span>$2');
        
        this.highlightLayer.innerHTML = html + '\n';
    },

    updateStatus: function(msg, state) {
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.querySelector('.status-indicator');
        if(statusText) statusText.textContent = msg;
        if(statusIndicator) statusIndicator.className = `status-indicator ${state}`;
    }
};
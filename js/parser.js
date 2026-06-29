const HTMLParser = {
    /**
     * Parses raw HTML string into a structured tree and extracts CSS.
     * Uses DOMParser exclusively (No Regex).
     */
    parse: function(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        
        // 1. Extract and remove <style> tags for the CSS parser (Step 4)
        let extractedCSS = '';
        const styleTags = doc.querySelectorAll('style');
        styleTags.forEach(style => {
            extractedCSS += style.textContent + '\n';
            style.remove(); 
        });
        
        const body = doc.body;
        
        // 2. Recursive tree builder
        function buildTree(node) {
            // Ignore comments
            if (node.nodeType === Node.COMMENT_NODE) return null;
            
            // Handle pure text nodes
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                return text ? { type: 'text', text: text } : null;
            }
            
            // Handle element nodes
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // Ignore non-visual tags
                if (['script', 'link', 'meta'].includes(tagName)) return null;
                
                const nodeData = {
                    type: 'element',
                    tag: tagName,
                    id: node.id || null,
                    // Use classList to avoid regex splitting
                    class: Array.from(node.classList), 
                    attributes: {},
                    text: '',
                    children: []
                };
                
                // Extract custom attributes
                for (let attr of node.attributes) {
                    if (attr.name !== 'class' && attr.name !== 'id') {
                        nodeData.attributes[attr.name] = attr.value;
                    }
                }
                
                // Process children
                let directText = '';
                for (let child of node.childNodes) {
                    const childTree = buildTree(child);
                    if (childTree) {
                        if (childTree.type === 'text') {
                            directText += childTree.text + ' ';
                        } else {
                            nodeData.children.push(childTree);
                        }
                    }
                }
                
                nodeData.text = directText.trim();
                return nodeData;
            }
            return null;
        }
        
        // 3. Build the root array
        const tree = [];
        for (let child of body.childNodes) {
            const parsed = buildTree(child);
            if (parsed) tree.push(parsed);
        }
        
        return {
            tree: tree,
            css: extractedCSS.trim()
        };
    },

    /**
     * Renders the parsed tree into the UI Explorer panel.
     */
    renderTree: function(tree, container) {
        container.innerHTML = '';
        if (!tree || tree.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No elements found</p>';
            return;
        }
        
        function renderNodes(nodes, parentEl, isRoot = false) {
            nodes.forEach(node => {
                const div = document.createElement('div');
                div.className = 'tree-node' + (isRoot ? ' root' : '');
                
                if (node.type === 'text') {
                    div.innerHTML = `<span class="tree-text">"${node.text}"</span>`;
                    parentEl.appendChild(div);
                    return;
                }
                
                // Build label with syntax-like coloring
                let label = `<span class="tree-tag">&lt;${node.tag}&gt;</span>`;
                if (node.id) label += ` <span class="tree-id">#${node.id}</span>`;
                if (node.class.length > 0) label += ` <span class="tree-class">.${node.class.join('.')}</span>`;
                
                div.innerHTML = label;
                parentEl.appendChild(div);
                
                // Recursively render children with indentation
                if (node.children && node.children.length > 0) {
                    const childWrapper = document.createElement('div');
                    childWrapper.className = 'tree-children';
                    
                    renderNodes(node.children, childWrapper);
                    parentEl.appendChild(childWrapper);
                }
            });
        }
        
        renderNodes(tree, container, true);
    }
};

const CSSParser = {
    /**
     * Parses CSS string using the browser's native CSSOM.
     * Returns a map of { selector: { property: value } }
     */
    parse: function(cssString) {
        if (!cssString || !cssString.trim()) return {};

        // Inject CSS into a temporary style element to leverage the browser's CSSOM
        const styleEl = document.createElement('style');
        styleEl.textContent = cssString;
        document.head.appendChild(styleEl);
        
        const rules = {};
        const sheet = styleEl.sheet;
        
        if (sheet && sheet.cssRules) {
            for (let i = 0; i < sheet.cssRules.length; i++) {
                const rule = sheet.cssRules[i];
                // Only process standard style rules (ignore @media, @keyframes for now)
                if (rule.type === CSSRule.STYLE_RULE) {
                    const selector = rule.selectorText;
                    const style = rule.style;
                    
                    const properties = {};
                    
                    // List of supported properties to extract
                    const supportedProps = [
                        'background', 'background-color', 'color', 
                        'width', 'height', 'padding', 'margin', 
                        'display', 'border-radius', 
                        'font-size', 'font-family', 'text-align', 
                        'overflow', 'gap', 'justify-content', 'align-items', 
                        'opacity',
                        // Flexbox specifics
                        'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink',
                        // Grid specifics
                        'grid-template-columns', 'grid-template-rows'
                    ];
                    
                    for (let prop of supportedProps) {
                        const val = style.getPropertyValue(prop);
                        if (val) {
                            properties[prop] = val.trim();
                        }
                    }
                    
                    if (Object.keys(properties).length > 0) {
                        rules[selector] = properties;
                    }
                }
            }
        }
        
        // Clean up DOM
        document.head.removeChild(styleEl);
        
        return rules;
    },

    /**
     * Computes the final style for a specific node by matching selectors.
     * Uses a simplified specificity and cascade model.
     */
    computeStyle: function(node, cssRules) {
        let computed = {};
        
        for (let selector in cssRules) {
            if (this.matchesSelector(node, selector)) {
                // Merge properties (simple cascade: later rules override)
                Object.assign(computed, cssRules[selector]);
            }
        }
        
        return computed;
    },

    /**
     * Checks if a node matches a CSS selector.
     * Supports tag, .class, #id, and combinations (e.g., div.hero#main).
     */
    matchesSelector: function(node, selector) {
        // Split by space for descendant combinators
        const parts = selector.trim().split(/\s+/);
        const targetPart = parts[parts.length - 1]; 
        
        return this.matchSimpleSelector(node, targetPart);
    },

    matchSimpleSelector: function(node, selector) {
        let tag = '';
        let ids = [];
        let classes = [];
        
        let current = '';
        let mode = 'tag'; 
        
        for (let i = 0; i < selector.length; i++) {
            const char = selector[i];
            if (char === '#') {
                if (current) {
                    if (mode === 'tag') tag = current;
                    else if (mode === 'class') classes.push(current);
                }
                current = '';
                mode = 'id';
            } else if (char === '.') {
                if (current) {
                    if (mode === 'tag') tag = current;
                    else if (mode === 'id') ids.push(current);
                }
                current = '';
                mode = 'class';
            } else {
                current += char;
            }
        }
        if (current) {
            if (mode === 'tag') tag = current;
            else if (mode === 'id') ids.push(current);
            else if (mode === 'class') classes.push(current);
        }
        
        // Validate matches
        if (tag && tag !== '*' && tag !== node.tag) return false;
        if (ids.length > 0 && node.id !== ids[0]) return false; 
        if (classes.length > 0 && !classes.every(c => node.class.includes(c))) return false;
        
        return true;
    },

    /**
     * Recursively walks the parsed tree and attaches computedStyle to each node.
     */
    applyStylesToTree: function(tree, cssRules) {
        if (!tree) return;
        
        function walk(nodes) {
            for (let node of nodes) {
                if (node.type === 'element') {
                    node.computedStyle = CSSParser.computeStyle(node, cssRules);
                    if (node.children && node.children.length > 0) {
                        walk(node.children);
                    }
                }
            }
        }
        
        walk(tree);
    },

    /**
     * Renders the parsed CSS rules into the UI.
     */
    renderRules: function(rules, container) {
        container.innerHTML = '';
        const selectors = Object.keys(rules);
        
        if (selectors.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No CSS rules found</p>';
            return;
        }
        
        selectors.forEach(selector => {
            const ruleDiv = document.createElement('div');
            ruleDiv.className = 'css-rule';
            
            let propsHtml = '';
            for (let prop in rules[selector]) {
                propsHtml += `<div class="css-prop"><span class="css-prop-name">${prop}</span>: <span class="css-prop-value">${rules[selector][prop]}</span>;</div>`;
            }
            
            ruleDiv.innerHTML = `
                <div class="css-selector">${selector} {</div>
                <div class="css-properties">${propsHtml}</div>
                <div class="css-selector">}</div>
            `;
            container.appendChild(ruleDiv);
        });
    }
};

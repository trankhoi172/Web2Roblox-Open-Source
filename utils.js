const Utils = {
    /**
     * Formats HTML string with proper indentation.
     * Uses DOMParser instead of Regex to strictly adhere to project rules.
     */
    formatHTML: function(html) {
        if (!html.trim()) return '';
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        function walk(node, indent) {
            let result = '';
            const pad = '  '.repeat(indent);
            
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) return pad + text + '\n';
                return '';
            }
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // Skip structural tags added by DOMParser
                if (['html', 'head', 'body'].includes(tagName)) {
                    for (let child of node.childNodes) {
                        result += walk(child, indent);
                    }
                    return result;
                }

                let attrs = '';
                for (let attr of node.attributes) {
                    attrs += ` ${attr.name}="${attr.value}"`;
                }
                
                const isVoid = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tagName);
                
                if (isVoid) {
                    return pad + `<${tagName}${attrs} />\n`;
                }
                
                let childrenStr = '';
                let hasBlockChild = false;
                for (let child of node.childNodes) {
                    if (child.nodeType === Node.ELEMENT_NODE) hasBlockChild = true;
                    childrenStr += walk(child, indent + 1);
                }
                
                if (!childrenStr.trim()) {
                    return pad + `<${tagName}${attrs}></${tagName}>\n`;
                }
                
                if (hasBlockChild) {
                    return pad + `<${tagName}${attrs}>\n` + childrenStr + pad + `</${tagName}>\n`;
                } else {
                    return pad + `<${tagName}${attrs}>` + childrenStr.trim() + `</${tagName}>\n`;
                }
            }
            return '';
        }
        
        let formatted = '';
        for (let child of doc.documentElement.childNodes) {
            formatted += walk(child, 0);
        }
        return formatted.trim();
    },

    escapeHTML: function(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
    }
};
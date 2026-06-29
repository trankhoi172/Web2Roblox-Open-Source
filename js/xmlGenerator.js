const XMLGenerator = {
        generate: function(robloxTree) {
        let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
        xml += '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n';
        xml += '  <Meta name="ExplicitAutoJoints">true</Meta>\n';
        
        const screenGui = {
            className: 'ScreenGui',
            name: 'Web2Roblox_Gui',
            properties: {
                ResetOnSpawn: false,
                IgnoreGuiInset: true
            },
            children: []
        };
        
        // Process root children - ALWAYS center fixed-size roots
        for (let child of robloxTree) {
            if (child.properties && child.properties.Size) {
                const size = child.properties.Size;
                // Check if it's a fixed size (not full screen)
                const isFullWidth = size.scaleX >= 0.95;
                const isFullHeight = size.scaleY >= 0.95;
                
                // If it's NOT full screen, center it
                if (!isFullWidth || !isFullHeight) {
                    child.properties.AnchorPoint = { x: 0.5, y: 0.5 };
                    child.properties.Position = { scaleX: 0.5, offsetX: 0, scaleY: 0.5, offsetY: 0 };
                }
            }
            screenGui.children.push(child);
        }
        
        xml += this.generateItem(screenGui, 1);
        xml += '</roblox>\n';
        return xml;
    },

    /**
     * Recursively generates an <Item> block.
     */
    generateItem: function(node, indent) {
        const pad = '  '.repeat(indent);
        // Generate a unique referent ID for Roblox Studio
        const ref = 'RBX' + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).toUpperCase();
        
        let xml = `${pad}<Item class="${node.className}" referent="${ref}">\n`;
        xml += `${pad}  <Properties>\n`;
        
        // Name property is always required for every instance
        xml += `${pad}    <string name="Name">${this.escapeXml(node.name)}</string>\n`;
        
        // Add mapped properties
        if (node.properties) {
            for (let key in node.properties) {
                xml += this.generateProperty(key, node.properties[key], indent + 2);
            }
        }
        
        xml += `${pad}  </Properties>\n`;
        
        // Recursively generate children
        if (node.children && node.children.length > 0) {
            for (let child of node.children) {
                xml += this.generateItem(child, indent + 1);
            }
        }
        
        xml += `${pad}</Item>\n`;
        return xml;
    },

    /**
     * Generates a <Property> block based on the data type.
     */
    generateProperty: function(name, value, indent) {
        const pad = '  '.repeat(indent);
        
        // Booleans
        if (typeof value === 'boolean') {
            return `${pad}<bool name="${name}">${value}</bool>\n`;
        }
        
        // Numbers (Floats/Ints)
        if (typeof value === 'number') {
            return `${pad}<float name="${name}">${value}</float>\n`;
        }
        
        // Strings
        if (typeof value === 'string') {
            return `${pad}<string name="${name}">${this.escapeXml(value)}</string>\n`;
        }
        
                // Complex Objects (Colors, Sizes, Enums)
        if (typeof value === 'object' && value !== null) {
            
            // Color3
            if ('r' in value && 'g' in value && 'b' in value && !('scaleX' in value) && !('x' in value)) {
                const r = (value.r / 255).toFixed(3);
                const g = (value.g / 255).toFixed(3);
                const b = (value.b / 255).toFixed(3);
                return `${pad}<Color3 name="${name}">\n${pad}  <R>${r}</R>\n${pad}  <G>${g}</G>\n${pad}  <B>${b}</B>\n${pad}</Color3>\n`;
            }
            
            // UDim2
            if ('scaleX' in value && 'offsetX' in value) {
                return `${pad}<UDim2 name="${name}">\n${pad}  <XS>${value.scaleX}</XS>\n${pad}  <XO>${value.offsetX}</XO>\n${pad}  <YS>${value.scaleY}</YS>\n${pad}  <YO>${value.offsetY}</YO>\n${pad}</UDim2>\n`;
            }
            
            // UDim
            if ('scale' in value && 'offset' in value && !('scaleX' in value)) {
                return `${pad}<UDim name="${name}">\n${pad}  <S>${value.scale}</S>\n${pad}  <O>${value.offset}</O>\n${pad}</UDim>\n`;
            }
            
            // Vector2 (AnchorPoint, Position)
            if ('x' in value && 'y' in value && !('scaleX' in value)) {
                return `${pad}<Vector2 name="${name}">\n${pad}  <X>${value.x}</X>\n${pad}  <Y>${value.y}</Y>\n${pad}</Vector2>\n`;
            }
            
            // Enums
            if (name === 'FillDirection') {
                const val = (value === 'X' || value === 'Horizontal') ? 0 : 1;
                return `${pad}<token name="${name}">${val}</token>\n`;
            }
            if (name === 'HorizontalAlignment') {
                const map = { 'Left': 0, 'Center': 1, 'Right': 2 };
                return `${pad}<token name="${name}">${map[value] !== undefined ? map[value] : 0}</token>\n`;
            }
            if (name === 'VerticalAlignment') {
                const map = { 'Top': 0, 'Center': 1, 'Bottom': 2 };
                return `${pad}<token name="${name}">${map[value] !== undefined ? map[value] : 0}</token>\n`;
            }
            if (name === 'TextXAlignment') {
                const map = { 'Left': 0, 'Center': 1, 'Right': 2 };
                return `${pad}<token name="${name}">${map[value] !== undefined ? map[value] : 0}</token>\n`;
            }
            if (name === 'SortOrder') {
                const map = { 'Name': 0, 'Custom': 1, 'LayoutOrder': 2 };
                return `${pad}<token name="${name}">${map[value] !== undefined ? map[value] : 0}</token>\n`;
            }
            
            // Font (String)
            if (name === 'Font') {
                return `${pad}<Font name="${name}">\n${pad}  <Family>${value}</Family>\n${pad}  <Weight>700</Weight>\n${pad}</Font>\n`;
            }
        }
        
        return '';
    },

    /**
     * Escapes special characters for valid XML.
     */
    escapeXml: function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
};

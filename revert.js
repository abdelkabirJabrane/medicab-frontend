const fs = require('fs');
const path = require('path');

const vars = `    --mc-primary:        #2563EB;
    --mc-primary-dark:   #1D4ED8;
    --mc-primary-light:  #EFF4FF;

    --mc-bg:             #F1F5FA;
    --mc-surface:        #FFFFFF;
    --mc-surface-2:      #F8FAFD;

    --mc-border:         #E5EAF4;
    --mc-border-hover:   #C9D4E8;

    --mc-text-1:         #0D1B3E;
    --mc-text-2:         #4A5878;
    --mc-text-3:         #8A95B0;

    --mc-green:          #059669;
    --mc-green-bg:       #ECFDF5;
    --mc-red:            #DC2626;
    --mc-red-bg:         #FEF2F2;
    --mc-orange:         #D97706;
    --mc-orange-bg:      #FFFBEB;
    --mc-blue:           #2563EB;
    --mc-blue-bg:        #EFF6FF;

    --mc-radius:         12px;
    --mc-radius-sm:      8px;
    --mc-radius-lg:      16px;

    --mc-shadow-sm:      0 1px 4px rgba(13,27,62,.07), 0 1px 2px rgba(13,27,62,.04);
    --mc-shadow-md:      0 4px 16px rgba(13,27,62,.08), 0 1px 4px rgba(13,27,62,.04);`;

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.scss')) results.push(file);
        }
    });
    return results;
}

const files = walk('c:/Users/ajabrane2/WebstormProjects/medicab-frontend/src/app');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Only process files that have ':host {' without '--mc-primary'
    if (content.includes(':host {') && !content.includes('--mc-primary:')) {
        let newContent = content.replace(/:host\s*\{/g, ':host {\n' + vars + '\n');
        
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log('Restored variables to', file);
        }
    }
});
console.log('Done');

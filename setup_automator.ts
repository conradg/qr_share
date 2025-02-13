import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findBunPath(): string {
    try {
        // Try to find bun in common locations
        const whichBun = execSync('which bun').toString().trim();
        if (whichBun) {
            return whichBun;
        }
    } catch (e) {
        // Check common installation paths
        const commonPaths = [
            '/.bun/bin/bun',
            '/.bunx/bun',
            '/opt/homebrew/bin/bun'
        ];
        
        for (const path of commonPaths) {
            const fullPath = process.env.HOME + path;
            try {
                if (execSync(`test -f "${fullPath}" && test -x "${fullPath}"`)) {
                    return fullPath;
                }
            } catch (e) {
                continue;
            }
        }
    }
    
    throw new Error('Bun installation not found. Please install Bun first: https://bun.sh');
}

function getQrSharePath(): string {
    const qrSharePath = join(__dirname, 'qr-share.ts');
    try {
        readFileSync(qrSharePath);
        return qrSharePath;
    } catch (e) {
        throw new Error('qr-share.ts not found in the current directory');
    }
}

function configureWorkflow() {
    try {
        const bunPath = findBunPath();
        const qrSharePath = getQrSharePath();
        
        // Read the workflow template
        const workflowPath = join(__dirname, 'Share via QR.workflow/Contents/document.wflow');
        let workflowContent = readFileSync(workflowPath, 'utf-8');
        
        // Replace placeholders
        workflowContent = workflowContent
            .replace('{{BUN_PATH}}', bunPath)
            .replace('{{QR_SHARE_PATH}}', qrSharePath);
            
        // Write back the configured workflow
        writeFileSync(workflowPath, workflowContent);
        
        console.log('Workflow configured successfully!');
        console.log(`Bun path: ${bunPath}`);
        console.log(`QR Share script path: ${qrSharePath}`);
        
    } catch (error) {
        console.error('Error configuring workflow:', error.message);
        process.exit(1);
    }
}

configureWorkflow(); 
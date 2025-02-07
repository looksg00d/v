import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

async function updateTopics(): Promise<boolean> {
    const pythonScript = path.join(__dirname, 'telegram_parser.py');
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    return new Promise((resolve, reject) => {
        const pythonProcess: ChildProcess = spawn(pythonCommand, [pythonScript], {
            stdio: 'inherit'
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Topics updated successfully');
                resolve(true);
            } else {
                console.error(`Python script exited with code ${code}`);
                reject(new Error(`Exit code: ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python script:', error);
            reject(error);
        });
    });
}

// Запускаем обновление
updateTopics().catch(console.error); 
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

/**
 * Gets the built-in VS Code Git API.
 */
export async function getGitApi(): Promise<any | undefined> {
    const extension = vscode.extensions.getExtension('vscode.git');
    if (!extension) {
        return undefined;
    }
    
    if (!extension.isActive) {
        await extension.activate();
    }
    
    // Get version 1 of the API
    return extension.exports.getAPI(1);
}

/**
 * Gets the Git repository for a specific file URI.
 */
export async function getRepositoryForFile(uri: vscode.Uri): Promise<any | undefined> {
    const gitApi = await getGitApi();
    if (!gitApi) {
        return undefined;
    }
    
    // getRepository returns the repository containing the file
    return gitApi.getRepository(uri);
}

/**
 * Gets the commit history for a specific file.
 * 
 * @param uri The URI of the file to get the history for.
 * @param maxEntries The maximum number of commits to retrieve.
 * @returns A promise that resolves to an array of commits.
 */
export async function getFileCommitHistory(uri: vscode.Uri, maxEntries: number = 50): Promise<any[] | undefined> {
    const repo = await getRepositoryForFile(uri);
    if (!repo) {
        throw new Error('Git repository not found for the specified file.');
    }

    // Use the log function from the repository to get the history specifically for this file
    const log = await repo.log({ path: uri.fsPath, maxEntries });
    return log;
}

/**
 * Gets the file content as a Buffer using git show.
 * 
 * @param repoRoot The root path of the repository
 * @param hash The commit hash
 * @param fsPath The absolute file path
 * @returns A promise that resolves to the file content as a Buffer
 */
export async function getGitFileContentAsBuffer(repoRoot: string, hash: string, fsPath: string): Promise<Buffer> {
    const relativePath = path.relative(repoRoot, fsPath).replace(/\\/g, '/');
    return new Promise((resolve, reject) => {
        cp.execFile('git', ['show', `${hash}:${relativePath}`], { cwd: repoRoot, encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 }, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

var vscode = require('vscode');

function activate(context) {
    var disposable = vscode.commands.registerCommand('extension.jsonNavigator_nextItem', function () {
        var editor = vscode.window.activeTextEditor;
        var currentPosition = editor.selection.active;
        editor.selection = findNextKeyOrValue(currentPosition, editor.document);
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

function findNextKeyOrValue(position, document) {
    var nextColonPosition = findUnquotedColonAfterPosition(position, document);
    var nextCommaPosition = findUnquotedCommaAfterPosition(position, document, nextColonPosition);
    if(nextCommaPosition && nextCommaPosition.isBefore(nextColonPosition)) {
        var key = document.getText(new vscode.Range(nextCommaPosition.line, nextCommaPosition.character + 1, nextColonPosition.line, nextColonPosition.character));
        var leadingWhitespace = key.length - key.trimLeft().length;
        var trailingWhitespace = key.length - key.trimRight().length;
        var start = document.offsetAt(nextCommaPosition);
        var end = document.offsetAt(nextColonPosition);
        start += leadingWhitespace;
        end -= trailingWhitespace;
        var selection = new vscode.Selection(document.positionAt(start + 1), document.positionAt(end));
        return selection;
    }
    else {
        var nextSeparatorPosition = findUnquotedSeparatorAfterPosition(nextColonPosition, document);
        if(!nextSeparatorPosition) {
            nextSeparatorPosition = findUnqotedClosingCurlyBraceAfterPosition(nextColonPosition, document);
        }
        var start = document.offsetAt(nextColonPosition);
        var end = document.offsetAt(nextSeparatorPosition);
        var value = document.getText(new vscode.Range(nextColonPosition.line, nextColonPosition.character + 1, nextSeparatorPosition.line, nextSeparatorPosition.character));
        var leadingWhitespace = value.length - value.trimLeft().length;
        var trailingWhitespace = value.length - value.trimRight().length;
        start += leadingWhitespace;
        end -= trailingWhitespace;
        var selection = new vscode.Selection(document.positionAt(start + 1), document.positionAt(end));
        return selection;
    }
}

function findUnqotedClosingCurlyBraceAfterPosition(position, document) {
    var lineNumber = position.line;
    while(lineNumber !== document.lineCount) {
        var inQuotes = false;
        var line = document.lineAt(lineNumber).text;
        for(var i = 0; i < line.length; i++) {
            var c = line[i];
            if(inQuotes && c === '\\') {
                i++;
                continue;
            }
            if(c === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if(!inQuotes && c === '}') {
                return new vscode.Position(lineNumber, i);
            }
        }
        lineNumber++;
    }
    return undefined;
}

function findUnquotedSeparatorAfterPosition(position, document) {
    var lineNumber = position.line;
    var hardOpen = 0;
    var curlyOpen = 0;
    while(lineNumber !== document.lineCount) {
        var inQuotes = false;
        var line = document.lineAt(lineNumber).text;
        for(var i = 0; i < line.length; i++) {
            var c = line[i];
            if(inQuotes && c === '\\') {
                i++;
                continue;
            }
            if(c === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if(!inQuotes) {
                if(c === ',' && hardOpen === 0 && curlyOpen === 0) {
                    return new vscode.Position(lineNumber, i);
                }
                else if(c === '{') {
                    curlyOpen++;
                    continue;
                }
                else if(c === '}') {
                    curlyOpen--;
                    if(hardOpen === 0 && curlyOpen === 0) {
                        // We add 1 to i because we want to select the closing brace.
                        return new vscode.Position(lineNumber, i + 1);
                    }
                    continue;
                }
                else if(c === '[') {
                    hardOpen++;
                    continue;
                }
                else if(c === ']') {
                    hardOpen--;
                    if(hardOpen === 0 && curlyOpen === 0) {
                        // We add 1 to i because we want to select the closing brace.
                        return new vscode.Position(lineNumber, i + 1);
                    }
                    continue;
                }
            }
        }
        lineNumber++;
    }
    return undefined;
}

function findUnquotedCommaAfterPosition(position, document, endPosition) {
    var lineNumber = position.line;
    var commaPosition;
    while(lineNumber !== document.lineCount) {
        var line = document.lineAt(lineNumber).text;
        var inQuotes = false;
        for(var i = 0; i < line.length; i++) {
            var currentPosition = new vscode.Position(lineNumber, i);
            if(currentPosition.isAfterOrEqual(endPosition)) {
                return commaPosition;
            }
            var c = line[i];
            if(inQuotes && c === '\\') {
                i++;
                continue;
            }
            if(c === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if(c === ',' && !inQuotes) {
                if(currentPosition.isAfterOrEqual(position)) {
                    commaPosition = currentPosition;
                }
                continue;
            }
        }
        lineNumber++;
    }
    return undefined;
}

function findUnquotedColonAfterPosition(position, document) {
    var lineNumber = position.line;
    var colonFound = false;
    while(!colonFound && lineNumber !== document.lineCount) {
        var line = document.lineAt(lineNumber).text;
        var inQuotes = false;
        for(var i = 0; i < line.length; i++) {
            var c = line[i];
            if(inQuotes && c === '\\') {
                i++;
                continue;
            }
            if(c === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if(c === ':' && !inQuotes) {
                var colonPosition = new vscode.Position(lineNumber, i);
                if(colonPosition.isAfterOrEqual(position)) {
                    return colonPosition;
                }
                continue;
            }
        }
        if(!colonFound) {
            lineNumber++;
        }
    }
    return undefined;
}
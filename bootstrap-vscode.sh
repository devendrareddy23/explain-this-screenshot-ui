#!/bin/bash
set -e

echo "==> Checking VS Code CLI..."
if ! command -v code >/dev/null 2>&1; then
  echo "ERROR: 'code' command not found."
  echo "Open VS Code -> Cmd+Shift+P -> Shell Command: Install 'code' command in PATH"
  exit 1
fi

echo "==> Installing recommended VS Code extensions..."
extensions=(
  "dbaeumer.vscode-eslint"
  "esbenp.prettier-vscode"
  "eamodio.gitlens"
  "mikestead.dotenv"
  "christian-kohler.path-intellisense"
  "bradlc.vscode-tailwindcss"
  "ms-azuretools.vscode-docker"
  "mongodb.mongodb-vscode"
  "humao.rest-client"
  "openai.chatgpt"
)

for ext in "${extensions[@]}"; do
  echo "Installing $ext"
  code --install-extension "$ext" || true
done

echo "==> Creating .vscode/settings.json..."
cat > .vscode/settings.json <<'SETTINGS'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "editor.tabSize": 2,
  "editor.detectIndentation": false,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.alwaysShowStatus": true,
  "prettier.requireConfig": false,
  "files.exclude": {
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": false
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
SETTINGS

echo "==> Creating .vscode/extensions.json..."
cat > .vscode/extensions.json <<'EXTENSIONS'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "eamodio.gitlens",
    "mikestead.dotenv",
    "christian-kohler.path-intellisense",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "mongodb.mongodb-vscode",
    "humao.rest-client",
    "openai.chatgpt"
  ]
}
EXTENSIONS

echo "==> Creating .vscode/tasks.json..."
cat > .vscode/tasks.json <<'TASKS'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: install",
      "type": "shell",
      "command": "npm install",
      "problemMatcher": []
    },
    {
      "label": "npm: dev",
      "type": "shell",
      "command": "npm run dev",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "npm: build",
      "type": "shell",
      "command": "npm run build",
      "problemMatcher": []
    }
  ]
}
TASKS

echo "==> Creating .prettierrc..."
cat > .prettierrc <<'PRETTIER'
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
PRETTIER

if [ ! -f .prettierignore ]; then
  echo "==> Creating .prettierignore..."
  cat > .prettierignore <<'PRETTIERIGNORE'
node_modules
dist
coverage
.env
PRETTIERIGNORE
fi

echo "==> Bootstrap complete."

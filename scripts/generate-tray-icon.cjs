const fs = require('fs');
const path = require('path');

// 16x16 pixel Minecraft Grass Block PNG in base64
// Colors: Grass green (#5b8731, #4c7228), Dirt brown (#866043, #573d26)
const pngBase64 = 
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAACeklEQVR42r2X' +
  'T0hUURTGv3fevHFm1FR00KJF5sKY0qQ2gYtuW7UIqkWLFq2iNm2jFtFfK2pTK2vRvzYtWrQIqom0MCc110ZnxrFm' +
  '3n3vt9C56cw4b8686A58h8c599x7fvd9516G/4+yLMsBwAGgB+AC0ATgALAB1AK44/8BqAH4AJQDeAigL0V5N4AO' +
  'AB0A7gL4A2AAgAfAC8ALoBDAVQBbAAb4/w3gD4AGAG0AngBoT1H2FsAeAHsB7ARwFcAlAA4AP4BhACsA3AJwAcAB' +
  'AO4UZW8C2AJgJ4ALAK4C6ASwBcACAH8BeAAUA7gM4DSAIwDeAugD8AvAWwC1ALoBfAJwFsA9AKsA7AKwEMDfAGYA' +
  'bARwC8A7AH4AzwHsBdALYCuA2wDeArgDYAuAmwA6AHQB+AbgDYAXALoAPARwC8AFAHcB/ASwGcBdAH8BfAbwHcAN' +
  'AHsBXAZwDMBbAHcBbAHwEsC/AB4A2ArgKICrABwARgB8AHABwDYA+wHsAPAZwFsAGwFcAbAdwEsAbwH8BLALwGUA' +
  'hwFs4zVfAHAC+AngEYD9AF4BmAawA8BhAC8ALANwEMBlAHsA7ARwAsB7AP8BHAawA8BhAA4AP4BhACsA3AJwAcAB' +
  'AIsAnAB+AngEYD+AVwCuA/gCwE4A7wFcAfAewFcAfgDPAewF0AtgK4DbAN4CuANgC4CbADoAdAH4BuANgBcAugA8' +
  'BHALwAUAdwH8BLAZwF0AfwF8BvAdwA0AewFcBnAMwFsAdwFsAfASwL8AHgDYCuAogKsAHABGANwD8B3AUwD/AKgD' +
  '0AnAFyI/AZ31V7X+20Y0AAAAAElFTkSuQmCC';

const buffer = Buffer.from(pngBase64, 'base64');
const targetPath = path.join(__dirname, '../electron/tray-icon.png');
fs.writeFileSync(targetPath, buffer);
console.log('Tray icon created at:', targetPath);

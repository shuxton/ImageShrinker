const path = require("path");
const os = require("os");
const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  shell,
  globalShortcut,
} = require("electron");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const slash = require("slash");
const log = require("electron-log");

process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV == "development";
const isMac = process.platform == "darwin";
const isWin = process.platform == "win32";
const isLin = process.platform == "linux";

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "ImageShrink",
    width: 500,
    height: 600,
    icon: "./assets/icons/Icon_256x256.png",
    resizable: isDev,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(`./app/index.html`);
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: "About Image Shrinker",
    width: 500,
    height: 600,
    icon: "./assets/icons/Icon_256x256.png",
    resizable: true,
    backgroundColor: "white",
    autoHideMenuBar: true,
  });

  aboutWindow.loadFile(`./app/about.html`);
}

app.on("ready", () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  globalShortcut.register("CmdOrCtrl+R", () => {
    mainWindow.reload();
  });
  globalShortcut.register("Ctrl+Shift+I", () => {
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on("ready", () => (mainWindow = null));
});

const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
];

ipcMain.on("image:minimize", (e, params) => {
  params.dest = path.join(os.homedir(), "ShrinkedImage");
  shrinkImage(params);
});

async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg(quality),
        imageminPngquant({ quality: [quality / 100, quality / 100] }),
      ],
    });
    log.info(files);

    shell.openPath(dest);

    mainWindow.webContents.send("image:done");
  } catch (error) {
    log.error(error);
  }
}

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length == 0) {
    createMainWindow();
  }
});

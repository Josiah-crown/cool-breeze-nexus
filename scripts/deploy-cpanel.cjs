/**
 * CI deploy to cPanel — uses npm `ftp-deploy` (same library as FTP-Deploy-Action)
 * so we avoid GitHub codeload failures when downloading third-party actions.
 */
const path = require("path");
const FtpDeploy = require("ftp-deploy");

const host = process.env.CPANEL_HOST;
const user = process.env.CPANEL_USER;
const password = process.env.CPANEL_PASS;
const remoteRoot = process.env.CPANEL_REMOTE_ROOT || "/public_html/";

if (!host || !user || !password) {
  console.error("Missing CPANEL_HOST, CPANEL_USER, or CPANEL_PASS");
  process.exit(1);
}

const ftpDeploy = new FtpDeploy();

const config = {
  user,
  password,
  host,
  port: 21,
  secure: true,
  localRoot: path.join(__dirname, "..", "dist"),
  remoteRoot,
  include: ["*", "**/*"],
  deleteRemote: false,
  forcePasv: true,
  // State file only — do not tie deploy to git remotes (avoids git network calls in CI)
  sftp: false,
};

ftpDeploy
  .deploy(config)
  .then((res) => {
    console.log("FTP deploy finished:", res);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

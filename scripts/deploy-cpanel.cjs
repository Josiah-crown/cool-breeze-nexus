/**
 * CI deploy to cPanel — npm ftp-deploy (basic-ftp).
 * Shared hosts (e.g. domains.co.za) often present a cert for *.domains.co.za
 * while you connect with your site domain — set CPANEL_TLS_STRICT=true only if
 * CPANEL_HOST matches the certificate (use cPanel "FTP Server" hostname).
 */
const path = require("path");
const FtpDeploy = require("ftp-deploy");

const host = (process.env.CPANEL_HOST || "").trim();
const user = (process.env.CPANEL_USER || "").trim();
const password = process.env.CPANEL_PASS;
const remoteRoot = process.env.CPANEL_REMOTE_ROOT || "/public_html/";
const tlsStrict = process.env.CPANEL_TLS_STRICT === "true";

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
  // Afrihost / domains.co.za and similar: cert is for *.domains.co.za, not your domain
  secureOptions: {
    rejectUnauthorized: tlsStrict,
  },
  localRoot: path.join(__dirname, "..", "dist"),
  remoteRoot,
  include: ["*", "**/*"],
  deleteRemote: false,
  forcePasv: true,
  sftp: false,
};

console.log(
  `FTPS ${host}:21 → ${remoteRoot} (TLS verify host cert: ${tlsStrict ? "on" : "off"})`
);

ftpDeploy
  .deploy(config)
  .then((res) => {
    console.log("FTP deploy finished:", res);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

import * as miio from "miio-api";
import yargs from "yargs";
import chalk from "chalk";

const error = chalk.bold.red;
const warning = chalk.bold.yellow;

const argv = yargs
  .scriptName("miio-cli")
  .options({
    token: {
      alias: "t",
      demandOption: true,
      describe: "device token",
      type: "string",
    },
    address: {
      alias: "a",
      demandOption: true,
      describe: "device IP address",
      type: "string",
    },
    attempts: {
      alias: "c",
      describe: "Retry attempts count",
      type: "number",
      default: 1,
    },
    delay: {
      alias: "d",
      describe: "Retry delay (seconds)",
      type: "number",
      default: 1,
    },
    timeout: {
      alias: "l",
      describe: "Response wait timeout (seconds)",
      type: "number",
      default: 5,
    },
  })
  .command("$0 <call> <args>", "Execute device command", (yargs) => {
    yargs
      .positional("call", {
        describe: `Name of device method to call. Examples: "miIO.info", "get_props", "set_props", "get_properties", etc.`,
        demandOption: true,
        type: "string",
      })
      .positional("args", {
        describe: "Method arguments as JSON string",
        demandOption: true,
        type: "string",
        default: "[]",
      });
  })
  .check((argv) => {
    if (!argv.token.match(/^[a-f0-9]{32}$/i)) {
      throw new Error(`Invalid token "${argv.token}", expected 32 hex digits`);
    }

    if (
      !argv.address.match(
        /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/,
      )
    ) {
      throw new Error(`Invalid IP address "${argv.address}"`);
    }

    try {
      JSON.parse(argv.args as string);
    } catch (e) {
      throw new Error(`Invalid args: ${e.message}`);
    }

    return true;
  }).argv;

(async () => {
  let device;

  try {
    device = await miio.device(
      {
        address: argv.address,
        token: argv.token,
      },
      {
        attempts: argv.attempts,
        timeout: argv.timeout * 1000,
        delay: argv.delay * 1000,
      },
    );
  } catch (err) {
    console.log(error(`${err.constructor.name}: ${err.message}`));
    if (err instanceof miio.SocketError) {
      console.log(
        warning("Please, check that provided IP address is correct!"),
      );
    }
    return;
  }

  try {
    const args = JSON.parse(argv.args as string);
    const result = await device.call(argv.call as string, args, {
      attempts: argv.attempts,
      timeout: argv.timeout * 1000,
      delay: argv.delay * 1000,
    });
    console.log(result);
  } catch (err) {
    console.log(error(`${err.constructor.name}: ${err.message}`));
    if (err instanceof miio.ProtocolError) {
      console.log(warning("Please, check that provided token is correct!"));
    }
  } finally {
    device.destroy();
  }
})();

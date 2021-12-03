const plugins = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const fs = require("fs");
const path = require("path");

// if you move flipper-expo, update this to point to your package.json file
const pjson = require("../package.json");

let FLIPPER_VERSION;
if (pjson && pjson.dependencies && pjson.dependencies["react-native-flipper"]) {
  const v = pjson.dependencies["react-native-flipper"];
  if (/[^\d.]/.test(v)) {
    throw new Error(
      `flipper-expo requires an explicit flipper version such as 0.123.0. You listed ${v} in your package.json`
    );
  }
  FLIPPER_VERSION = v;
}

function isFlipperInstalled() {
  return !!FLIPPER_VERSION;
}

function isFlipperLinked() {
  // TODO: Autolink detection when supported
  return true;
}

module.exports = function withFlipper(config) {
  return plugins.withDangerousMod(config, [
    "ios",
    async (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      const contents = fs.readFileSync(filePath, "utf-8");
      const installed = isFlipperInstalled();
      const linked = isFlipperLinked();

      if (!installed || !linked) {
        return config;
      }

      // https://react-native-community.github.io/upgrade-helper/?from=0.63.0&to=0.64.2
      const enableFlipper = mergeContents({
        tag: "flipper",
        src: contents,
        newSrc: `  use_flipper!()`,
        anchor: /#\s*use_flipper!\(/i,
        offset: 0,
        comment: "#",
      });

      if (!enableFlipper.didMerge) {
        console.log(
          "ERROR: Cannot add react-native-flipper to the project's ios/Podfile because it's malformed. Please report this with a copy of your project Podfile."
        );
        return config;
      }

      fs.writeFileSync(filePath, enableFlipper.contents);

      return config;
    },
  ]);
};

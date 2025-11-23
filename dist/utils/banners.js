import figlet from "figlet";
export function showEVVMBanner() {
    console.log("\n");
    console.log(figlet.textSync("EVVM", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default"
    }));
    console.log("     ⚡  EVVM Fisher/Relayer Initialized  ⚡\n");
}
export function showMeshBanner() {
    console.log("\n");
    console.log(figlet.textSync("MESH", {
        font: "Small",
        horizontalLayout: "default",
        verticalLayout: "default"
    }));
    console.log("     🌐  Mesh Network Started  🌐\n");
}
export function showAppBanner() {
    console.log("\n");
    console.log(figlet.textSync("Offline Payments", {
        font: "Small",
        horizontalLayout: "default",
        verticalLayout: "default"
    }));
    console.log("     📡  Offline Mesh Payments System  📡\n");
}
//# sourceMappingURL=banners.js.map
setInterval(async () => {
  const commandResponse = await fetch("http://localhost:1234/command");
  const command = await commandResponse.text();
  switch (command) {
    case "NETWORK":
      fetch("http://localhost:1234/ack", { method: "POST", body: "NETWORK" });
      chrome.devtools.network.getHAR((completeHAR) => {
        fetch("http://localhost:1234/network", {
          method: "POST",
          body: JSON.stringify(completeHAR),
          headers: { "Content-Type": "application/json" },
        });
      });
      break;
    default:
      console.log("received command: ", command);
  }
}, 1000);

<script setup lang="ts">
import { onHide, onLaunch, onShow } from "@dcloudio/uni-app";
import { useWebSocket } from "./utils/websocket";
import { conversationStore } from "./store/conversation";

const ws = useWebSocket();
let appMessageListenerReady = false;

const handleAppSocketMessage = (msg: any) => {
  conversationStore.updateConversation(msg);
};

onLaunch(() => {
  console.log("App Launch");
  ws.connect();
  if (!appMessageListenerReady) {
    ws.on("message", handleAppSocketMessage);
    appMessageListenerReady = true;
  }
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* #ifdef H5 */
body {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
  -webkit-appearance: none;
  background: transparent;
}
/* #endif */
</style>

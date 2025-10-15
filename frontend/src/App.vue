<template>
  <div class="app">
    <Sidebar :isCollapsed="isSidebarCollapsed" @toggle="toggleSidebar" />
    <div :class="['main-content', { 'sidebar-collapsed': isSidebarCollapsed }]">
      <Home />
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import Sidebar from "./components/Sidebar.vue";
import Home from "./pages/Home.vue";

export default {
  name: "App",
  components: {
    Sidebar,
    Home,
  },
  setup() {
    const isSidebarCollapsed = ref(false);

    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    return {
      isSidebarCollapsed,
      toggleSidebar,
    };
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
    "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  display: flex;
  height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #f8fcfa 0%, #ffffff 100%);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  transition: margin-left 0.3s ease;
}

.main-content.sidebar-collapsed {
  margin-left: 0;
}
</style>

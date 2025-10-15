<template>
  <div
    :class="['sidebar', { collapsed: isCollapsed }]"
    @click="handleSidebarClick"
  >
    <div class="sidebar-header">
      <h2 class="sidebar-title">HUDS Nutrition</h2>
      <button
        class="collapse-button"
        @click.stop="$emit('toggle')"
        :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 4h18M3 12h18M3 20h18"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
    <nav class="sidebar-nav">
      <ul>
        <li
          v-for="item in navigationItems"
          :key="item.id"
          class="nav-item active"
        >
          <span class="nav-icon" v-html="item.iconSvg"></span>
          <span v-if="!isCollapsed" class="nav-label">{{ item.label }}</span>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
export default {
  name: "Sidebar",
  props: {
    isCollapsed: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["toggle"],
  data() {
    return {
      navigationItems: [
        {
          id: "home",
          label: "Home",
          path: "/",
          iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>`,
        },
        // Future navigation items can be added here
      ],
    };
  },
  methods: {
    handleSidebarClick() {
      if (this.isCollapsed) {
        this.$emit("toggle");
      }
    },
  },
};
</script>

<style scoped>
.sidebar {
  width: 260px;
  background-color: #f0f9f4;
  color: #1a5f3f;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, background-color 0.2s ease;
  border-right: 1px solid #d1e7dd;
  position: relative;
  cursor: default;
}

.sidebar.collapsed {
  width: 70px;
  cursor: pointer;
}

.sidebar.collapsed .sidebar-title {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #d1e7dd;
  min-height: 60px;
}

.sidebar-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  transition: opacity 0.2s ease, width 0.3s ease;
  color: #1a5f3f;
}

.collapse-button {
  background: transparent;
  border: none;
  color: #1a5f3f;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.collapse-button:hover {
  background-color: #d8f0e3;
}

.sidebar-nav {
  flex: 1;
  padding: 0.5rem 0;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 8px;
  color: #1a5f3f;
}

.nav-item:hover {
  background-color: #d8f0e3;
}

.nav-item.active {
  background-color: #c8e6d4;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  flex-shrink: 0;
  color: #1a5f3f;
}

.nav-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.nav-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-left: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.75rem;
}
</style>

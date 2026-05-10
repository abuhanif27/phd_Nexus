#!/bin/bash

# RAM Deep Clean & Optimization Script
# This script helps free up memory for development on low-RAM systems.

echo "🧹 Starting RAM Deep Clean..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Kill orphaned development processes
echo -e "${YELLOW}Killing orphaned Node and Python processes...${NC}"
pkill -f 'next dev'
pkill -f 'manage.py runserver'
pkill -9 -f 'node.*next-server' 2>/dev/null
pkill -9 -f 'python.*manage.py' 2>/dev/null
# Kill any remaining node processes that aren't this one
# (Be careful here, but usually safe in this context)
# ps aux | grep node | grep -v 'gemini' | awk '{print $2}' | xargs kill -9 2>/dev/null

# 2. Clear System Caches (Needs Sudo - will ask if run manually)
echo -e "${YELLOW}Clearing system caches...${NC}"
if [ "$EUID" -ne 0 ]; then
  echo "Note: To clear system pagecache, dentries, and inodes, please run: 'sudo sync; echo 3 | sudo tee /proc/sys/vm/drop_caches'"
else
  sync; echo 3 > /proc/sys/vm/drop_caches
  echo -e "${GREEN}✓ System caches cleared${NC}"
fi

# 3. Clear Swap (if possible)
if [ "$EUID" -eq 0 ]; then
  echo -e "${YELLOW}Re-initializing swap...${NC}"
  swapoff -a && swapon -a
  echo -e "${GREEN}✓ Swap cleared${NC}"
fi

# 4. Project Cleanup
echo -e "${YELLOW}Cleaning project build artifacts...${NC}"
rm -rf frontend/.next
echo -e "${GREEN}✓ Frontend build cache (.next) cleared${NC}"

# 5. VS Code Memory Tips
echo ""
echo -e "${GREEN}💡 VS Code Optimization Tips:${NC}"
echo "1. Disable heavy extensions you don't need (e.g., Pylance, Gemini if not active)."
echo "2. Use 'Developer: Open Process Explorer' in VS Code to see what's eating RAM."
echo "3. Restart VS Code regularly."

# 5. Browser Tips
echo ""
echo -e "${GREEN}🌐 Browser Tips:${NC}"
echo "1. Firefox is currently using ~15-20% of your RAM."
echo "2. Close unused tabs or use an extension like 'Auto Tab Discard'."
echo "3. Consider using a lighter browser for development (like Brave or Chromium without sync)."

echo ""
echo -e "${GREEN}✨ Memory cleanup complete!${NC}"
free -h

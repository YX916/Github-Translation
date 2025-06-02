const TranslationData = [
  [`Created {1} commits in {0} repository`, `在 {0} 个仓库中创建了 {1} 次提交`],

  [`Sort`, `排序`],
  [`Sort by`, `排序方式`],
  [`Lists`, `列表 `],
  [`Search`, `搜索`],
];

const MutationObserverConfig = {
  childList: true,
  subtree: true,
  attributeFilter: ["data-label"],
  characterData: true,
};

// 将字符串中的占位符转换为正则表达式模式
function createPlaceholderPattern (str) {
  // 转义字符串中的正则特殊字符
  let escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 将 {0}, {1}, ... 替换为捕获组
  return new RegExp('^' + escaped.replace(/\\\{(\d+)\\\}/g, '(.*?)') + '$');
}

// 处理占位符的函数
function replacePlaceholders (translated, original, matches) {
  return translated.replace(/{(\d+)}/g, (match, index) => {
    return matches[parseInt(index) + 1] || match;
  });
}

// 构建翻译映射，包含正则表达式模式
function buildTranslationMap () {
  const map = new Map();
  const patterns = [];

  TranslationData.forEach(([key, val]) => {
    if (!key) return;

    // 普通字符串映射（无占位符）
    if (!key.includes('{')) {
      map.set(key, { translation: val, pattern: null });
    }
    // 包含占位符的字符串，创建正则表达式模式
    else {
      const pattern = createPlaceholderPattern(key);
      patterns.push({ pattern, translation: val });
    }
  });

  return { map, patterns };
}

const { map: dataMap, patterns: placeholderPatterns } = buildTranslationMap();

const observer = new MutationObserver(function (mutations) {
  const treeWalker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ALL,
    {
      acceptNode: function (node) {
        if (
          node.nodeType === 3 ||
          (node.hasAttribute &&
            (node.hasAttribute("data-label") ||
              node.hasAttribute("placeholder") ||
              node.hasAttribute("value")))
        ) {
          return NodeFilter.FILTER_ACCEPT;
        } else {
          return NodeFilter.FILTER_SKIP;
        }
      },
    },
    false
  );

  let currentNode = treeWalker.currentNode;
  while (currentNode) {
    let originalText = '';

    if (currentNode.nodeType === 3) {
      originalText = currentNode.textContent.trim().replace(/\s+/g, ' ');
    } else {
      originalText = currentNode.getAttribute("data-label") ||
        currentNode.getAttribute("placeholder") ||
        currentNode.getAttribute("value") || '';
      originalText = originalText.trim().replace(/\s+/g, ' ');
      if (!originalText) {
        currentNode = treeWalker.nextNode();
        continue;
      }
    }

    // 首先检查普通字符串映射
    let translationInfo = dataMap.get(originalText);

    // 如果没有找到，检查占位符模式
    if (!translationInfo) {
      for (const { pattern, translation } of placeholderPatterns) {
        const matches = originalText.match(pattern);
        if (matches) {
          translationInfo = { translation, matches };
          break;
        }
      }
    }

    // 应用翻译
    if (translationInfo) {
      let translated = translationInfo.translation;

      // 如果有占位符匹配，替换它们
      if (translationInfo.matches) {
        translated = replacePlaceholders(translated, originalText, translationInfo.matches);
      }

      // 更新节点内容
      if (currentNode.nodeType === 3) {
        currentNode.textContent = translated;
      } else {
        if (currentNode.hasAttribute("data-label")) {
          currentNode.setAttribute("data-label", translated);
        }
        if (currentNode.hasAttribute("placeholder")) {
          currentNode.setAttribute("placeholder", translated);
        }
        if (currentNode.hasAttribute("value")) {
          currentNode.setAttribute("value", translated);
        }
      }
    }

    currentNode = treeWalker.nextNode();
  }
});

observer.observe(document.body, MutationObserverConfig);
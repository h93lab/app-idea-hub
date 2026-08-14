import { ZipArchive, type ArchiverError } from "archiver";
import type { Response } from "express";

export type FlutterBlueprint = Record<string, unknown>;

function safeProjectName(value: unknown) {
  const normalized = String(value || "my_flutter_app").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "my_flutter_app";
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
}

export function buildFlutterBlueprintFiles(input: FlutterBlueprint) {
  const projectName = safeProjectName(input.projectName);
  const screens = asList(input.screens);
  const testing = asList(input.testing);
  const architecture = String(input.architecture || "Feature-first + Riverpod");
  const dataLayer = String(input.dataLayer || "Repository pattern");
  const backend = String(input.backend || "Offline-first until validation proves the need for a backend");
  const claudePrompt = String(input.claudePrompt || `Create a production-ready Flutter MVP for ${projectName}. Preserve the blueprint decisions, use small testable increments, and do not add infrastructure before validating the core workflow.`);

  const blueprint = JSON.stringify({ projectName, architecture, screens, dataLayer, backend, testing, claudePrompt }, null, 2);
  const readme = `# ${projectName}\n\nThis package was exported from App Idea Hub as a starting point for a solo Flutter build. It is intentionally a small, reviewable skeleton rather than a claim that the product is production-ready.\n\n## Blueprint\n\n- Architecture: ${architecture}\n- Data layer: ${dataLayer}\n- Backend direction: ${backend}\n- Planned screens: ${screens.join(", ") || "Define the first workflow before adding screens."}\n- Testing: ${testing.join(", ") || "Add unit, widget, and integration smoke tests."}\n\n## Start\n\nRun flutter pub get, then flutter analyze and flutter test. Replace the placeholder screen only after writing the first acceptance criterion.\n`;
  const claude = `# Claude Code instructions\n\nYou are implementing the Flutter project ${projectName} as a solo developer. Work in small vertical slices and keep the app runnable after each change.\n\n## Product brief\n\n${claudePrompt}\n\n## Constraints\n\n1. Preserve the architecture and data-layer decisions in the file named blueprint.json.\n2. Do not invent customer evidence, ratings, testimonials, search volume, or market facts. Mark assumptions in code comments or documentation.\n3. Prefer a narrow MVP and a real device smoke test over speculative infrastructure.\n4. Add or update tests with every feature.\n5. Before introducing a dependency, explain why the Flutter SDK or current project structure is insufficient.\n\n## First task\n\nInspect blueprint.json, define the smallest end-to-end user flow, implement it behind the placeholder screen, and run analyze plus tests.\n`;
  const pubspec = `name: ${projectName}\ndescription: A Flutter MVP scaffold exported from App Idea Hub.\npublish_to: "none"\nversion: 0.1.0+1\n\nenvironment:\n  sdk: \">=3.3.0 <4.0.0\"\n\ndependencies:\n  flutter:\n    sdk: flutter\n  cupertino_icons: ^1.0.8\n\ndev_dependencies:\n  flutter_test:\n    sdk: flutter\n  flutter_lints: ^5.0.0\n\nflutter:\n  uses-material-design: true\n`;
  const mainDart = `import 'package:flutter/material.dart';\n\nvoid main() {\n  runApp(const BlueprintApp());\n}\n\nclass BlueprintApp extends StatelessWidget {\n  const BlueprintApp({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      title: '${projectName.replace(/_/g, " ")}',\n      theme: ThemeData(colorSchemeSeed: Colors.deepPurple, useMaterial3: true),\n      home: const BlueprintHomePage(),\n    );\n  }\n}\n\nclass BlueprintHomePage extends StatelessWidget {\n  const BlueprintHomePage({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return Scaffold(\n      appBar: AppBar(title: const Text('First workflow')),\n      body: const Center(\n        child: Padding(\n          padding: EdgeInsets.all(24),\n          child: Text('Replace this screen with the smallest validated user flow.'),\n        ),\n      ),\n    );\n  }\n}\n`;
  const widgetTest = `import 'package:flutter_test/flutter_test.dart';\nimport 'package:${projectName}/main.dart';\n\nvoid main() {\n  testWidgets('shows the first workflow placeholder', (tester) async {\n    await tester.pumpWidget(const BlueprintApp());\n    expect(find.text('First workflow'), findsOneWidget);\n  });\n}\n`;
  return {
    projectName,
    files: {
      "README.md": readme,
      "CLAUDE.md": claude,
      "blueprint.json": blueprint,
      "pubspec.yaml": pubspec,
      "lib/main.dart": mainDart,
      "test/widget_test.dart": widgetTest,
      ".gitignore": ".dart_tool/\n.flutter-plugins\n.flutter-plugins-dependencies\nbuild/\n.env\n",
    },
  };
}

export function streamFlutterBlueprintZip(res: Response, blueprint: FlutterBlueprint) {
  const output = buildFlutterBlueprintFiles(blueprint);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", (error: ArchiverError) => {
    if (!res.headersSent) res.status(500).json({ error: error.message });
    else res.destroy(error);
  });
  res.status(200);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${output.projectName}-flutter-blueprint.zip"`);
  archive.pipe(res);
  for (const [file, content] of Object.entries(output.files)) archive.append(content, { name: `${output.projectName}/${file}` });
  archive.finalize();
}

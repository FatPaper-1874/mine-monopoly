import { Plugin } from 'vite';
import { Project, InterfaceDeclaration, EnumDeclaration, SourceFile } from 'ts-morph';
import fs from 'fs';
import path from 'path';

interface InterfaceToProtoOptions {
  inputPath: string;
  outputPath: string;
}

export default function interfaceToProtoPlugin(options: InterfaceToProtoOptions): Plugin {
  return {
    name: 'vite-plugin-interface-to-proto',
    apply: 'serve',

    async buildStart() {
      const { inputPath, outputPath } = options;

      const project = new Project({
        tsConfigFilePath: 'tsconfig.json', // 支持跨文件引用
      });

      const sourceFile = project.addSourceFileAtPath(inputPath);
      await project.resolveSourceFileDependencies();

      const allInterfaces = project.getSourceFiles().flatMap(file => file.getInterfaces());
      const allEnums = project.getSourceFiles().flatMap(file => file.getEnums());

      const processed = new Set<string>();
      const protoMessages: string[] = [];

      // Enums first
      for (const enumDecl of allEnums) {
        if (!processed.has(enumDecl.getName())) {
          protoMessages.push(generateEnum(enumDecl));
          processed.add(enumDecl.getName());
        }
      }

      // Then messages
      for (const iface of allInterfaces) {
        if (!processed.has(iface.getName())) {
          const msg = generateProtoFromInterface(iface, processed, project);
          protoMessages.push(msg);
        }
      }

      const output = `syntax = "proto3";\n\n${protoMessages.join('\n\n')}\n`;

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, output, 'utf-8');
      console.info(`✅ Proto generated at ${outputPath}`);
    }
  };
}

// 支持基本类型、数组、enum、引用 interface
function mapTsTypeToProto(tsType: string): { protoType: string; isRepeated: boolean } {
  if (tsType.endsWith('[]')) {
    const baseType = tsType.replace('[]', '');
    const mapped = mapTsTypeToProto(baseType);
    return { protoType: mapped.protoType, isRepeated: true };
  }

  switch (tsType) {
    case 'string':
      return { protoType: 'string', isRepeated: false };
    case 'number':
      return { protoType: 'int32', isRepeated: false };
    case 'boolean':
      return { protoType: 'bool', isRepeated: false };
    default:
      return { protoType: tsType, isRepeated: false };
  }
}

function generateEnum(enumDecl: EnumDeclaration): string {
  const name = enumDecl.getName();
  const members = enumDecl.getMembers();

  let output = `enum ${name} {\n`;
  for (const member of members) {
    const memberName = member.getName();
    const value = member.getValue();
    output += `  ${memberName} = ${value};\n`;
  }
  output += `}`;
  return output;
}

function generateProtoFromInterface(
  iface: InterfaceDeclaration,
  processed: Set<string>,
  project: Project
): string {
  const name = iface.getName();
  if (processed.has(name)) return '';
  processed.add(name);

  const props = iface.getProperties();
  let result = `message ${name} {\n`;

  let index = 1;
  for (const prop of props) {
    const propName = prop.getName();
    const typeNode = prop.getTypeNodeOrThrow();
    const tsType = typeNode.getText();
    const cleanType = tsType.replace('[]', '');

    const { protoType, isRepeated } = mapTsTypeToProto(tsType);
    const prefix = isRepeated ? 'repeated ' : '';
    result += `  ${prefix}${protoType} ${propName} = ${index++};\n`;

    // 查找引用 interface 或 enum
    const referencedFile = project.getSourceFiles().find(f =>
      f.getInterface(cleanType) || f.getEnum(cleanType)
    );

    if (referencedFile) {
      const ifaceDecl = referencedFile.getInterface(cleanType);
      if (ifaceDecl && !processed.has(cleanType)) {
        const nested = generateProtoFromInterface(ifaceDecl, processed, project);
        result = `${nested}\n${result}`;
      }

      const enumDecl = referencedFile.getEnum(cleanType);
      if (enumDecl && !processed.has(cleanType)) {
        const nested = generateEnum(enumDecl);
        result = `${nested}\n${result}`;
        processed.add(cleanType);
      }
    }
  }

  result += `}`;
  return result;
}

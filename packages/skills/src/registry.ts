import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export interface SkillsConfig {
  rootDir: string;
  skillsRegistryPath: string;
  skillsRequireSignature: boolean;
  skillsPublicKeyPath: string;
}

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  tools_allowed: string[];
  risk_profile: number;
  author: string;
  signed: boolean;
}

export interface SkillInstallResult {
  name: string;
  installedPath: string;
  signatureVerified: boolean;
}

function readSkillManifest(skillDir: string): SkillManifest {
  const manifestPath = path.join(skillDir, 'skill.yaml');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return YAML.parse(raw) as SkillManifest;
}

function buildSignaturePayload(skillDir: string): string {
  const manifestPath = path.join(skillDir, 'skill.yaml');
  const promptPath = path.join(skillDir, 'prompt.md');
  const manifest = fs.readFileSync(manifestPath, 'utf-8').trimEnd();
  const prompt = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf-8').trimEnd() : '';
  return `${manifest}\n---\n${prompt}\n`;
}

function verifySkillSignature(skillDir: string, publicKeyPem: string): boolean {
  const signaturePath = path.join(skillDir, 'skill.sig');
  if (!fs.existsSync(signaturePath)) {
    return false;
  }

  const signature = fs.readFileSync(signaturePath, 'utf-8').trim();
  const payload = buildSignaturePayload(skillDir);

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(payload);
  verifier.end();
  return verifier.verify(publicKeyPem, Buffer.from(signature, 'base64'));
}

export class SkillRegistry {
  private readonly installedPath: string;

  constructor(private readonly config: SkillsConfig) {
    this.installedPath = path.resolve(this.config.rootDir, 'data/skills-installed');
    fs.mkdirSync(this.installedPath, { recursive: true });
  }

  listAvailableSkills(): string[] {
    if (!fs.existsSync(this.config.skillsRegistryPath)) {
      return [];
    }

    return fs
      .readdirSync(this.config.skillsRegistryPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  install(name: string): SkillInstallResult {
    const sourceDir = path.join(this.config.skillsRegistryPath, name);
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Skill not found in local registry: ${name}`);
    }

    const manifest = readSkillManifest(sourceDir);
    if (!manifest.name || manifest.name !== name) {
      throw new Error(`Skill manifest mismatch for ${name}`);
    }

    const publicKeyPem = fs.existsSync(this.config.skillsPublicKeyPath)
      ? fs.readFileSync(this.config.skillsPublicKeyPath, 'utf-8')
      : '';

    const signatureVerified = publicKeyPem ? verifySkillSignature(sourceDir, publicKeyPem) : false;

    if (this.config.skillsRequireSignature && !signatureVerified) {
      throw new Error(`Skill signature verification failed for ${name}`);
    }

    const destinationDir = path.join(this.installedPath, name);
    fs.rmSync(destinationDir, { recursive: true, force: true });
    fs.cpSync(sourceDir, destinationDir, { recursive: true });

    return {
      name,
      installedPath: destinationDir,
      signatureVerified,
    };
  }
}

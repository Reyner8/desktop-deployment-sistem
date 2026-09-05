export abstract class ObjectStorage {
  abstract upload(file: Express.Multer.File, key: string): Promise<void>;
  abstract getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  abstract getFilePath(key: string): string;
  abstract delete(key: string): Promise<void>;
}
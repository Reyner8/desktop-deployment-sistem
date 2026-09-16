export abstract class ObjectStorage {
  abstract upload(file: Express.Multer.File, key: string): Promise<void>;

  getSignedUrl(_key: string, _expiresIn?: number): Promise<string> {
    return Promise.reject(
      new Error('Signed URL is not supported for this storage driver'),
    );
  }

  abstract delete(key: string): Promise<void>;

  abstract composeParts(partKeys: string[], objectKey: string): Promise<void>;

  abstract getReadStream(key: string): Promise<NodeJS.ReadableStream>;
}

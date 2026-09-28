import { IsString, IsOptional, IsInt, Min, MaxLength, Matches } from 'class-validator';

export class CreateUploadDto {
  // application dan version menjadi potongan object key
  // (${application}/${version}/${version}${ext}) sehingga ikut menentukan
  // path file di storage. Keduanya wajib bebas karakter path.
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message:
      'application may only contain letters, numbers, dot, underscore, and dash, and must start with a letter or number',
  })
  application: string;

  // SemVer adalah format yang diharapkan (lihat AGENTS.md bagian Versioning),
  // tapi validator ini sengaja tidak memaksa pola semver agar tidak merusak
  // release lama. Yang ditegakkan hanya aturan path: tidak boleh diawali
  // titik supaya "." dan ".." tidak mungkin terjadi.
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._+-]*$/, {
    message:
      'version may only contain letters, numbers, dot, dash, plus, and underscore, and must start with a letter or number',
  })
  version: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  // fileName dipakai untuk extension object key dan diteruskan ke header
  // Content-Disposition saat artifact diunduh, jadi harus berupa nama file
  // polos tanpa separator, tanpa tanda kutip, dan tanpa baris baru.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[^/\\"'\r\n]+$/, {
    message: 'fileName must be a plain file name without path separators or quotes',
  })
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsInt()
  @Min(1)
  totalSize: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sha256?: string;
}
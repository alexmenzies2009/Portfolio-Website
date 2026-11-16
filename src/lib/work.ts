// Loads the projects. Each project is one folder in src/content/work:
//
//   src/content/work/my-project/
//     index.md      the text (title, tagline, category, ...)
//     cover.jpg     the image used on cards and at the top of the project page
//     01.jpg ...    every other image in the folder becomes the gallery, in file-name order
//
// Nothing else needs to be registered anywhere.
import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

const files = import.meta.glob<{ default: ImageMetadata }>('/src/content/work/*/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}', { eager: true });

export type Project = CollectionEntry<'work'> & { data: CollectionEntry<'work'>['data'] & { cover: ImageMetadata; gallery: ImageMetadata[]; /** 1-based position in the list */ number: number } };

const isCover = (name: string) => /^cover\./i.test(name);

/** All projects, sorted by `order` (projects without one come first), with their images attached. */
export async function getWork(): Promise<Project[]> {
  const entries = await getCollection('work');
  const projects = entries.map((entry) => {
    const prefix = `/src/content/work/${entry.id}/`;
    const images = Object.keys(files)
      .filter((path) => path.startsWith(prefix))
      .map((path) => ({ name: path.slice(prefix.length), image: files[path].default }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
    if (!images.length) throw new Error(`Project "${entry.id}" has no images. Add at least a cover image to src/content/work/${entry.id}/`);
    const cover = images.find((i) => isCover(i.name)) ?? images[0];
    const gallery = images.filter((i) => i !== cover).map((i) => i.image);
    return { ...entry, data: { ...entry.data, cover: cover.image, gallery, number: 0 } } as Project;
  });
  projects.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
  projects.forEach((p, i) => (p.data.number = i + 1));
  return projects;
}

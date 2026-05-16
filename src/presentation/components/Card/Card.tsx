'use client';

import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
  /** Optional title. */
  title?: string;
  /** Optional additional class name. */
  className?: string;
  /** Card content. */
  children: React.ReactNode;
}

/**
 * Container card for grouping content. Styles via CSS Module only.
 * @expandable Add footer slot, padding variant, or elevation.
 */
export function Card({ title, className = '', children }: CardProps): React.ReactElement {
  const classNames = [styles.card, className].filter(Boolean).join(' ');
  return (
    <section className={classNames} aria-labelledby={title ? 'card-title' : undefined}>
      {title ? (
        <h2 id="card-title" className={styles.title}>
          {title}
        </h2>
      ) : null}
      <div className={styles.content}>{children}</div>
    </section>
  );
}

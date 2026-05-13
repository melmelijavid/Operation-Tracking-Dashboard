function getPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 5) {
    return [1, 2, 3, 4, 5, 'end-gap', totalPages];
  }

  if (currentPage >= totalPages - 4) {
    return [1, 'start-gap', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    'start-gap',
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    'end-gap',
    totalPages,
  ];
}

export default function PaginationButtons({
  currentPage,
  totalPages,
  onPageChange,
  buttonClassName,
  activeClassName = 'active',
}) {
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <>
      {pageItems.map((item) => {
        if (typeof item === 'string') {
          return (
            <span className={`${buttonClassName} pagination-ellipsis`} key={item} aria-hidden="true">
              ...
            </span>
          );
        }

        return (
          <button
            type="button"
            key={item}
            className={currentPage === item ? `${buttonClassName} ${activeClassName}` : buttonClassName}
            aria-current={currentPage === item ? 'page' : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        );
      })}
    </>
  );
}

import { gql, useMutation, useQuery } from '@apollo/client'
import { Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import Box from '@mui/material/Box'
import { useCallback, useState } from 'react'
import EditIcon from '@mui/icons-material/Edit'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'

const ALL_BOOKS_QUERY = gql`
  query {
    books {
      id
      title
    }
  }`

const UPDATE_BOOK_MUTATION = gql`
  mutation UpdateBook($id: ID!, $title: String!) {
    editBook(bookId: $id, book: {title: $title}) {
      success
      book {
        id
        title
      }
    }
  }`

const DELETE_BOOK_MUTATION = gql`
  mutation DeleteBook($id: ID!) {
    deleteBook(bookId: $id) {
      success
      book {
        id
        title
      }
    }
  }`

const ADD_BOOK_MUTATION = gql`
  mutation AddBook($title: String!) {
    addBook(book: {title: $title}) {
      success
      book {
        id
        title
      }
    }
  }`


interface BookProps {
  bookId: string
  title: string
  updateBookCallback: (bookId: string, title: string) => void
  deleteBookCallback: (bookId: string) => void
}

const Book = ( {bookId, title, updateBookCallback, deleteBookCallback} : BookProps) => {
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editingTitle, setEditingTitle] = useState<string>(title)

  const startEditingCallback = useCallback(() => {
    setIsEditing(true)
    setEditingTitle(title)
  }, [setIsEditing, setEditingTitle, title])

  const editingTitleChangeCallback = useCallback((e: any) => {
    setEditingTitle(e.target.value)
  }, [setEditingTitle])

  const acceptEditsCallback = useCallback(() => {
    setIsEditing(false)
    updateBookCallback(bookId, editingTitle)
  }, [setIsEditing, updateBookCallback, editingTitle, bookId])

  const cancelEditsCallback = useCallback(() => {
    setIsEditing(false)
    setEditingTitle(title)
  }, [setIsEditing, setEditingTitle, title])

  const sx={
    display: "flex",
    width: "100%",
  }

  return <Box key={bookId} sx={sx}>
    { isEditing ?
      <Stack direction="row">
        <TextField variant="standard" 
          onChange={(e) => editingTitleChangeCallback(e)}
          value={editingTitle}
          >
        </TextField>
        <IconButton onClick={acceptEditsCallback}>
          <CheckIcon/>
        </IconButton>
        <IconButton onClick={cancelEditsCallback}>
          <CancelIcon/>
        </IconButton>
      </Stack>
      :
      <Stack direction="row">
        <Typography>{title}</Typography>
        <IconButton onClick={startEditingCallback}>
          <EditIcon/>
        </IconButton>
        <IconButton onClick={() => deleteBookCallback(bookId)} >
          <DeleteIcon/>
        </IconButton>
      </Stack>
    }
  </Box>
}

const AllBooks = () => {
  const { loading, error, data } = useQuery(ALL_BOOKS_QUERY);
  const [updateBook] = useMutation(UPDATE_BOOK_MUTATION);
  const [deleteBook] = useMutation(DELETE_BOOK_MUTATION, {
    update: (cache, { data: { deleteBook } }) => {
      if (!deleteBook.success) {
        return
      }
      const normalizedId = cache.identify(deleteBook.book)
      cache.evict({ id: normalizedId })
    }
  });
  const [addBook] = useMutation(ADD_BOOK_MUTATION, {
    update: (cache, { data: { addBook } }) => {
      if (!addBook.success) {
        return
      }
      cache.modify({
        fields: {
          books(existingBooks = []) {
            const newBookRef = cache.writeFragment({
              data: addBook.book,
              fragment: gql`
                fragment NewBook on Book {
                  id
                  title
                }
              `
            })
            return [...existingBooks, newBookRef]
          }
        }
      })
    }
  })
  
  const updateBookCallback = useCallback((bookId: string, title: string) => {
    updateBook({ variables: { id: bookId, title: title } })
  }, [updateBook]);

  const deleteBookCallback = useCallback((bookId: string) => {
    deleteBook({ variables: { id: bookId } })
  }, [deleteBook]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error contacting server</p>;
  const booksComponent = data.books.map((book: any) => {
    return <Book key={book.id} bookId={book.id} title={book.title} updateBookCallback={updateBookCallback} deleteBookCallback={deleteBookCallback}/>
  });
  return <Box>
    { booksComponent }
    <Button variant="contained" onClick={() => addBook({variables: {title: "example"}})}>
      Add Book
    </Button>
  </Box>
}

function App() {

  return (
    <Box sx={{
      padding: 2,
    }}>
      <AllBooks />
    </Box>
  );
}

export default App;

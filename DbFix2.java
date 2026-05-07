import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DbFix2 {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/appointment_db";
        String user = "root";
        String pass = "Root";

        try {
            Connection conn = DriverManager.getConnection(url, user, pass);
            Statement stmt = conn.createStatement();
            System.out.println("Updating statut column in appointments table...");
            stmt.executeUpdate("ALTER TABLE appointments MODIFY COLUMN statut VARCHAR(50) NOT NULL");
            System.out.println("Success! The 'statut' column has been updated to VARCHAR(50) to prevent ENUM errors.");
            stmt.close();
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
